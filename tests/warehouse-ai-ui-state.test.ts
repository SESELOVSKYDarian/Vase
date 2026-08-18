import { describe, expect, it } from 'vitest'
import { aiChatReducer, initialAiChatState } from '../apps/vase-management/components/warehouse/ai-state'

describe('warehouse AI chat state', () => {
  it('does not confirm the same proposal twice', () => {
    const received = aiChatReducer(initialAiChatState, {
      type: 'RECEIVE',
      message: {
        id: 'proposal-1',
        role: 'ai',
        text: '¿Confirmás el cambio?',
        response: { text: '¿Confirmás?', requiresConfirmation: true, proposal: { ledNumber: 14 } },
        proposalStatus: 'idle',
      },
    })
    const confirming = aiChatReducer(received, { type: 'CONFIRM_START', messageId: 'proposal-1' })
    const duplicate = aiChatReducer(confirming, { type: 'CONFIRM_START', messageId: 'proposal-1' })

    expect(duplicate).toBe(confirming)
  })

  it('marks a proposal as done and appends the result', () => {
    const state = {
      ...initialAiChatState,
      messages: [{
        id: 'proposal-1',
        role: 'ai' as const,
        text: 'Confirmar',
        proposalStatus: 'confirming' as const,
      }],
    }
    const done = aiChatReducer(state, {
      type: 'CONFIRM_DONE',
      messageId: 'proposal-1',
      result: { id: 'result-1', role: 'ai', text: 'Cambio realizado' },
    })

    expect(done.messages[0].proposalStatus).toBe('done')
    expect(done.messages[1].text).toBe('Cambio realizado')
  })
})
