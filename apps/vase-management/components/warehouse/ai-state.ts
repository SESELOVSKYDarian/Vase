import type { AiCommandResponse } from './types'

export type AiChatMessage = {
  id: string
  role: 'user' | 'ai'
  text: string
  response?: AiCommandResponse
  proposalStatus?: 'idle' | 'confirming' | 'done' | 'cancelled'
}

export type AiChatState = {
  messages: AiChatMessage[]
  sending: boolean
  error: string | null
}

export const initialAiChatState: AiChatState = {
  messages: [],
  sending: false,
  error: null,
}

export type AiChatAction =
  | { type: 'SEND'; message: AiChatMessage }
  | { type: 'RECEIVE'; message: AiChatMessage }
  | { type: 'FAIL'; message: string; messageId?: string }
  | { type: 'CONFIRM_START'; messageId: string }
  | { type: 'CONFIRM_DONE'; messageId: string; result: AiChatMessage }
  | { type: 'CANCEL'; messageId: string }

export function aiChatReducer(state: AiChatState, action: AiChatAction): AiChatState {
  if (action.type === 'SEND') {
    return { messages: [...state.messages, action.message], sending: true, error: null }
  }
  if (action.type === 'RECEIVE') {
    return { messages: [...state.messages, action.message], sending: false, error: null }
  }
  if (action.type === 'FAIL') {
    return {
      ...state,
      sending: false,
      error: action.message,
      messages: action.messageId
        ? state.messages.map((message) => message.id === action.messageId
          ? { ...message, proposalStatus: 'idle' }
          : message)
        : state.messages,
    }
  }
  if (action.type === 'CONFIRM_START') {
    const target = state.messages.find((message) => message.id === action.messageId)
    if (!target || target.proposalStatus !== 'idle') return state
    return {
      ...state,
      error: null,
      messages: state.messages.map((message) => message.id === action.messageId
        ? { ...message, proposalStatus: 'confirming' }
        : message),
    }
  }
  if (action.type === 'CONFIRM_DONE') {
    return {
      ...state,
      messages: [
        ...state.messages.map((message) => message.id === action.messageId
          ? { ...message, proposalStatus: 'done' as const }
          : message),
        action.result,
      ],
    }
  }
  return {
    ...state,
    messages: state.messages.map((message) => message.id === action.messageId
      ? { ...message, proposalStatus: 'cancelled' }
      : message),
  }
}
