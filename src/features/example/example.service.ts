/**
 * Example Service
 */

import { ApiService } from '../../services/ApiService'
import type { Example } from './example.types'

export class ExampleService {
  static async getAll(): Promise<Example[]> {
    return ApiService.get<Example[]>('/examples')
  }

  static async getById(id: string): Promise<Example> {
    return ApiService.get<Example>(`/examples/${id}`)
  }

  static async create(data: Omit<Example, 'id'>): Promise<Example> {
    return ApiService.post<Example>('/examples', data)
  }

  static async update(id: string, data: Partial<Example>): Promise<Example> {
    return ApiService.put<Example>(`/examples/${id}`, data)
  }

  static async delete(id: string): Promise<void> {
    return ApiService.delete(`/examples/${id}`)
  }
}
