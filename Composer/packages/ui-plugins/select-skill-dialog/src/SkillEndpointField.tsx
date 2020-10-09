// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import React, { useMemo } from 'react';
import { Dropdown, IDropdownOption } from 'office-ui-fabric-react/lib/Dropdown';
import { FieldProps, useShellApi } from '@bfc/extension-client';
import { FieldLabel } from '@bfc/adaptive-form';
import { getSkillNameFromSetting, Skill, VIRTUAL_LOCAL_ENDPOINT } from '@bfc/shared';
import { SelectableOptionMenuItemType } from 'office-ui-fabric-react/lib/ComboBox';

export const SkillEndpointField: React.FC<FieldProps> = (props) => {
  const { description, label, required, uiOptions, value } = props;
  const { shellApi, skillsSettings, skills } = useShellApi();
  const { updateSkill } = shellApi;

  const id = getSkillNameFromSetting(value?.skillEndpoint);
  const skill: Skill = skills[id] || {};

  const { endpointUrl: endpointUrlInSettings, msAppId: msAppIdInSettings } = skillsSettings[id] || {};

  const endpoints = skill?.manifest?.endpoints || [];

  const options = useMemo(() => {
    const endpointsInManifest = endpoints.map(({ name, endpointUrl, msAppId }, key) => ({
      key,
      text: name,
      data: {
        endpointUrl,
        msAppId,
        name,
      },
      isManifestEndpoint: true,
    }));

    let localEndpoint: any[] = [];
    if (!skill.remote) {
      localEndpoint = [
        {
          key: -1,
          text: VIRTUAL_LOCAL_ENDPOINT.name,
          data: {
            endpointUrl: endpointUrlInSettings,
            msAppId: msAppIdInSettings,
            name: VIRTUAL_LOCAL_ENDPOINT.name,
          },
        },
        {
          key: 'separator',
          itemType: SelectableOptionMenuItemType.Divider,
          text: '',
        },
      ];
    }
    return [...localEndpoint, ...endpointsInManifest];
  }, [endpoints]);

  const { key } = options.find(({ data, isManifestEndpoint }) => {
    return isManifestEndpoint && data?.endpointUrl === endpointUrlInSettings && data?.msAppId === msAppIdInSettings;
  }) || { key: -1 };

  const handleChange = (_: React.FormEvent<HTMLDivElement>, option?: IDropdownOption) => {
    if (option) {
      updateSkill(id, { skill: { ...skill }, selectedEndpointIndex: Number(option.key) });
    }
  };

  return (
    <React.Fragment>
      <FieldLabel description={description} helpLink={uiOptions?.helpLink} id={id} label={label} required={required} />
      <Dropdown options={options} selectedKey={key} onChange={handleChange} />
    </React.Fragment>
  );
};
