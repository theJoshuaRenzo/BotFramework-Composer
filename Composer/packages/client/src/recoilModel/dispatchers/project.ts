/* eslint-disable react-hooks/rules-of-hooks */
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { useRecoilCallback, CallbackInterface } from 'recoil';
import { dereferenceDefinitions, LuFile, DialogInfo, SensitiveProperties } from '@bfc/shared';
import { indexer, validateDialog } from '@bfc/indexers';
import lodashGet from 'lodash/get';
import lodashSet from 'lodash/get';
import isArray from 'lodash/isArray';
import formatMessage from 'format-message';

import filePersistence from '../../store/persistence/FilePersistence';
import lgWorker from '../parsers/lgWorker';
import luWorker from '../parsers/luWorker';
import httpClient from '../../utils/httpUtil';
import { BotStatus } from '../../constants';
import { getReferredFiles } from '../../utils/luUtil';
import luFileStatusStorage from '../../utils/luFileStatusStorage';
import { DialogSetting } from '../../store/types';
import settingStorage from '../../utils/dialogSettingStorage';

import {
  skillManifestsState,
  BotDiagnosticsState,
  settingsState,
  localeState,
  luFilesState,
  skillsState,
  schemasState,
  lgFilesState,
  locationState,
  botStatusState,
  botNameState,
  botEnvironmentState,
  dialogsState,
  projectIdState,
  botOpeningState,
  recentProjectsState,
  templateProjectsState,
  runtimeTemplatesState,
  templateIdState,
  applicationErrorState,
} from './../atoms';
import { logMessage } from './../dispatchers/shared';

const checkProjectUpdates = async () => {
  const workers = [filePersistence, lgWorker, luWorker];

  return Promise.all(workers.map((w) => w.flush()));
};

const processSchema = (projectId: string, schema: any) => ({
  ...schema,
  definitions: dereferenceDefinitions(schema.definitions),
});

// if user set value in terminal or appsetting.json, it should update the value in localStorage
const refreshLocalStorage = (projectId: string, settings: DialogSetting) => {
  for (const property of SensitiveProperties) {
    const value = lodashGet(settings, property);
    if (value) {
      settingStorage.setField(projectId, property, value);
    }
  }
};

// merge sensitive values in localStorage
const mergeLocalStorage = (projectId: string, settings: DialogSetting) => {
  const localSetting = settingStorage.get(projectId);
  if (localSetting) {
    for (const property of SensitiveProperties) {
      const value = lodashGet(localSetting, property);
      if (value) {
        lodashSet(settings, property, value);
      } else {
        lodashSet(settings, property, ''); // set those key back, because that were omit after persisited
      }
    }
  }
};

const updateLuFilesStatus = (projectId: string, luFiles: LuFile[]) => {
  const status = luFileStatusStorage.get(projectId);
  return luFiles.map((luFile) => {
    if (typeof status[luFile.id] === 'boolean') {
      return { ...luFile, published: status[luFile.id] };
    } else {
      return { ...luFile, published: false };
    }
  });
};

const initLuFilesStatus = (projectId: string, luFiles: LuFile[], dialogs: DialogInfo[]) => {
  luFileStatusStorage.checkFileStatus(
    projectId,
    getReferredFiles(luFiles, dialogs).map((file) => file.id)
  );
  return updateLuFilesStatus(projectId, luFiles);
};

export const projectDispatcher = () => {
  const initBotState = async (callbackHelpers: CallbackInterface, data: any) => {
    const { set, snapshot } = callbackHelpers;
    const { files, botName, botEnvironment, location, schemas, settings, id, locale, diagnostics, skills } = data;
    schemas.sdk.content = processSchema(id, schemas.sdk.content);
    const { dialogs, luFiles, lgFiles, skillManifestFiles } = indexer.index(files, botName, locale);
    const verifiedDialogs = dialogs.map((dialog) => {
      dialog.diagnostics = validateDialog(dialog, schemas.sdk.content, lgFiles, luFiles);
      return dialog;
    });
    set(projectIdState, id);
    set(dialogsState, verifiedDialogs);
    set(botEnvironmentState, botEnvironment);
    set(botNameState, botName);
    const curLocation = await snapshot.getPromise(locationState);
    if (location !== curLocation) {
      set(botStatusState, BotStatus.unConnected);
      set(locationState, location);
    }
    set(lgFilesState, lgFiles);
    set(skillsState, skills);
    set(schemasState, schemas);
    set(luFilesState, initLuFilesStatus(botName, luFiles, dialogs));
    set(settingsState, settings);
    set(localeState, locale);
    set(BotDiagnosticsState, diagnostics);
    set(skillManifestsState, skillManifestFiles);
    set(botOpeningState, false);
    refreshLocalStorage(id, settings);
    mergeLocalStorage(id, settings);
  };

  const removeRecentProject = async (callbackHelpers: CallbackInterface, path: string) => {
    try {
      const {
        set,
        snapshot: { getPromise },
      } = callbackHelpers;
      const currentRecentProjects = await getPromise(recentProjectsState);
      const index = currentRecentProjects.findIndex((p) => p.path == path);
      currentRecentProjects.splice(index, 1);
      set(recentProjectsState, {
        ...currentRecentProjects,
      });
    } catch (ex) {
      // TODO: Handle exceptions
      logMessage(callbackHelpers, `Error removing recent project: ${ex}`);
    }
  };

  const setOpenPendingStatusasync = async (callbackHelpers: CallbackInterface) => {
    const { set } = callbackHelpers;
    set(botOpeningState, true);
    await checkProjectUpdates();
  };

  const openBotProject = useRecoilCallback<[string, string?], Promise<string>>(
    (callbackHelpers: CallbackInterface) => async (path: string, storageId = 'default') => {
      try {
        await setOpenPendingStatusasync(callbackHelpers);
        const response = await httpClient.put(`/projects/open`, { path, storageId });
        await initBotState(callbackHelpers, response.data);
        return response.data.id;
      } catch (ex) {
        removeRecentProject(callbackHelpers, path);
      }
    }
  );

  const fetchProjectById = useRecoilCallback<[string], Promise<void>>(
    (callbackHelpers: CallbackInterface) => async (projectId: string) => {
      const response = await httpClient.get(`/projects/${projectId}`);
      await initBotState(callbackHelpers, response.data);
    }
  );

  const createProject = useRecoilCallback<[string, string, string, string, string], Promise<string>>(
    (callbackHelpers: CallbackInterface) => async (
      templateId: string,
      name: string,
      description: string,
      location: string,
      schemaUrl?: string
    ) => {
      await setOpenPendingStatusasync(callbackHelpers);
      const response = await httpClient.post(`/projects`, {
        storageId: 'default',
        templateId,
        name,
        description,
        location,
        schemaUrl,
      });
      const projectId = response.data.id;
      if (settingStorage.get(projectId)) {
        settingStorage.remove(projectId);
      }
      await initBotState(callbackHelpers, response.data);
      return projectId;
    }
  );

  const deleteBotProject = useRecoilCallback<[string], Promise<void>>(
    ({ reset }: CallbackInterface) => async (projectId: string) => {
      try {
        await httpClient.delete(`/projects/${projectId}`);
        luFileStatusStorage.removeAllStatuses(projectId);
        settingStorage.remove(projectId);
        reset(projectIdState);
        reset(dialogsState);
        reset(botEnvironmentState);
        reset(botNameState);
        reset(botStatusState);
        reset(locationState);
        reset(lgFilesState);
        reset(skillsState);
        reset(schemasState);
        reset(luFilesState);
        reset(settingsState);
        reset(localeState);
        reset(skillManifestsState);
      } catch (e) {
        //TODO: error handling
        console.log(e);
      }
    }
  );

  const saveProjectAs = useRecoilCallback<[string, string, string, string], Promise<string>>(
    (callbackHelpers: CallbackInterface) => async (projectId, name, description, location) => {
      try {
        await setOpenPendingStatusasync(callbackHelpers);
        const response = await httpClient.post(`/projects/${projectId}/project/saveAs`, {
          storageId: 'default',
          name,
          description,
          location,
        });
        await initBotState(callbackHelpers, response.data);
        return response.data.id;
      } catch (error) {
        //TODO: error handling
        callbackHelpers.set(botOpeningState, false);
      }
    }
  );

  const fetchRecentProjects = useRecoilCallback<[], void>((callbackHelpers: CallbackInterface) => async () => {
    const { set } = callbackHelpers;
    try {
      const response = await httpClient.get(`/projects/recent`);
      set(recentProjectsState, response.data);
    } catch (ex) {
      // TODO: Handle exceptions
      set(recentProjectsState, []);
      logMessage(callbackHelpers, `Error in fetching recent projects: ${ex}`);
    }
  });

  const fetchTemplateProjects = useRecoilCallback<[], Promise<void>>(
    (callbackHelpers: CallbackInterface) => async () => {
      const { set } = callbackHelpers;
      try {
        const response = await httpClient.get(`/assets/projectTemplates`);
        if (isArray(response.data)) {
          set(templateProjectsState, [...response.data]);
        }
      } catch (ex) {
        // TODO: Handle exceptions
        logMessage(callbackHelpers, `Error setting template projects: ${ex}`);
      }
    }
  );

  const fetchRuntimeTemplates = useRecoilCallback<[], Promise<void>>(
    (callbackHelpers: CallbackInterface) => async () => {
      const { set } = callbackHelpers;
      try {
        const response = await httpClient.get(`/runtime/templates`);
        if (isArray(response.data)) {
          set(runtimeTemplatesState, [...response.data]);
        }
      } catch (ex) {
        // TODO: Handle exceptions
        logMessage(callbackHelpers, `Error fetching runtime templates: ${ex}`);
      }
    }
  );

  const saveTemplateId = useRecoilCallback<[string], void>(({ set }: CallbackInterface) => (templateId) => {
    if (templateId) {
      set(templateIdState, templateId);
    }
  });

  const fetchTemplates = useRecoilCallback<[], Promise<void>>((callbackHelpers: CallbackInterface) => async () => {
    try {
      const response = await httpClient.get(`/assets/projectTemplates`);

      const data = response && response.data;

      if (data && Array.isArray(data) && data.length > 0) {
        callbackHelpers.set(templateProjectsState, data);
      }
    } catch (err) {
      // TODO: Handle exceptions
      logMessage(callbackHelpers, `Error fetching runtime templates: ${err}`);
    }
  });

  const setBotStatus = useRecoilCallback<[BotStatus], Promise<void>>(
    ({ set }: CallbackInterface) => async (status: BotStatus) => {
      set(botStatusState, status);
    }
  );

  const createFolder = useRecoilCallback<[string, string], Promise<void>>(
    ({ set }: CallbackInterface) => async (path, name) => {
      const storageId = 'default';
      try {
        await httpClient.post(`/storages/folder`, { path, name, storageId });
      } catch (err) {
        set(applicationErrorState, {
          message: err.message,
          summary: formatMessage('Create Folder Error'),
        });
      }
    }
  );

  const updateFolder = useRecoilCallback<[string, string, string], Promise<void>>(
    ({ set }: CallbackInterface) => async (path, oldName, newName) => {
      const storageId = 'default';
      try {
        await httpClient.put(`/storages/folder`, { path, oldName, newName, storageId });
      } catch (err) {
        set(applicationErrorState, {
          message: err.message,
          summary: formatMessage('Update Folder Name Error'),
        });
      }
    }
  );

  return {
    openBotProject,
    createProject,
    deleteBotProject,
    saveProjectAs,
    saveTemplateId,
    fetchTemplates,
    fetchProjectById,
    fetchRecentProjects,
    fetchTemplateProjects,
    fetchRuntimeTemplates,
    setBotStatus,
    updateFolder,
    createFolder,
  };
};
