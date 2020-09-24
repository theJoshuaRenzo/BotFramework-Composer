// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { IDropdownOption } from 'office-ui-fabric-react/lib/Dropdown';
import { SDKKinds } from '@bfc/shared';

export const eventTypeKey = SDKKinds.OnDialogEvent;
export const intentTypeKey = SDKKinds.OnIntent;
export const activityTypeKey = SDKKinds.OnActivity;
export const qnaMatcherKey = SDKKinds.OnQnAMatch;
export const onChooseIntentKey = SDKKinds.OnChooseIntent;
export const customEventKey = 'CustomEvents';

export const TriggerOptions: IDropdownOption[] = [
  { key: 'Microsoft.OnIntent', text: 'Intent recognized' },
  { key: 'Microsoft.OnQnAMatch', text: 'QnA Intent recognized' },
  { key: 'Microsoft.OnUnknownIntent', text: 'Unknown intent' },
  { key: 'Microsoft.OnDialogEvent', text: 'Dialog events' },
  { key: 'Microsoft.OnActivity', text: 'Activities' },
  { key: 'Microsoft.OnChooseIntent', text: 'Duplicated intents recognized' },
  { key: customEventKey, text: 'Custom events' },
];

export const ActivityOptions: IDropdownOption[] = [
  { key: 'Microsoft.OnActivity', text: 'Activities (Activity received)' },
  { key: 'Microsoft.OnConversationUpdateActivity', text: 'Greeting (ConversationUpdate activity)' },
  { key: 'Microsoft.OnEndOfConversationActivity', text: 'Conversation ended (EndOfConversation activity)' },
  { key: 'Microsoft.OnEventActivity', text: 'Event received (Event activity)' },
  { key: 'Microsoft.OnHandoffActivity', text: 'Handover to human (Handoff activity)' },
  { key: 'Microsoft.OnInvokeActivity', text: 'Conversation invoked (Invoke activity)' },
  { key: 'Microsoft.OnTypingActivity', text: 'User is typing (Typing activity)' },
  { key: 'Microsoft.OnMessageActivity', text: 'Message received (Message received activity)' },
  { key: 'Microsoft.OnMessageDeleteActivity', text: 'Message deleted (Message deleted activity)' },
  { key: 'Microsoft.OnMessageReactionActivity', text: 'Message reaction (Message reaction activity)' },
  { key: 'Microsoft.OnMessageUpdateActivity', text: 'Message updated (Message updated activity)' },
];

export const EventOptions: IDropdownOption[] = [
  { key: 'Microsoft.OnBeginDialog', text: 'Dialog started (Begin dialog event)' },
  { key: 'Microsoft.OnCancelDialog', text: 'Dialog cancelled (Cancel dialog event)' },
  { key: 'Microsoft.OnError', text: 'Error occurred (Error event)' },
  { key: 'Microsoft.OnRepromptDialog', text: 'Re-prompt for input (Reprompt dialog event)' },
];