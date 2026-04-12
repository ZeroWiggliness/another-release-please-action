import { jest } from '@jest/globals'

export const loadConfig = jest.fn()
export const GitHubProvider = jest.fn().mockImplementation(() => ({}))
