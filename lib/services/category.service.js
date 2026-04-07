import { supabase } from '@/lib/supabase/client'
import { validateCategory, validateCategoryField } from '@/lib/validators/categories'
import { AppError, NotFoundError } from '@/lib/utils/errors'
import { createLogger } from '@/lib/utils/logger'

const logger = createLogger('CategoryService')

export class CategoryService {
  constructor(userId) {
    this.userId = userId
    this.supabase = supabase.getClient()
  }

  // Get all categories for user
  async getAll(includeInactive = false) {
    try {
      let query = this.supabase
        .from('categories')
        .select(`
          *,
          category_fields (
            id,
            field_name,
            field_type,
            placeholder,
            is_required,
            "order",
            options
          )
        `)
        .eq('user_id', this.userId)
        .order('order', { ascending: true })
        .order('name', { ascending: true })
      
      if (!includeInactive) {
        query = query.eq('is_active', true)
      }
      
      const { data, error } = await query
      
      if (error) {
        logger.error('Failed to fetch categories', error)
        throw new AppError(error.message, 400)
      }
      
      return data
    } catch (error) {
      logger.error('Get all categories failed', error, { userId: this.userId })
      throw error
    }
  }

  // Get single category by ID
  async getById(categoryId) {
    try {
      const { data, error } = await this.supabase
        .from('categories')
        .select(`
          *,
          category_fields (
            id,
            field_name,
            field_type,
            placeholder,
            is_required,
            "order",
            options
          )
        `)
        .eq('id', categoryId)
        .eq('user_id', this.userId)
        .single()
      
      if (error || !data) {
        throw new NotFoundError('Category')
      }
      
      return data
    } catch (error) {
      logger.error('Get category failed', error, { userId: this.userId, categoryId })
      throw error
    }
  }

  // Create new category
  async create(data) {
    try {
      // Validate input
      const validation = validateCategory(data)
      if (!validation.isValid) {
        throw new AppError(JSON.stringify(validation.errors), 400)
      }
      
      // Check if category with same name exists
      const existing = await this.getByName(validation.data.name)
      if (existing) {
        throw new AppError('Category with this name already exists', 400)
      }
      
      // Create category
      const { data: category, error } = await this.supabase
        .from('categories')
        .insert({
          ...validation.data,
          user_id: this.userId
        })
        .select()
        .single()
      
      if (error) {
        logger.error('Failed to create category', error)
        throw new AppError(error.message, 400)
      }
      
      logger.info('Category created', { userId: this.userId, categoryId: category.id })
      
      return category
    } catch (error) {
      logger.error('Category creation failed', error, { userId: this.userId, data })
      throw error
    }
  }

  // Update category
  async update(categoryId, data) {
    try {
      // Verify ownership
      await this.getById(categoryId)
      
      // Validate update data (partial validation)
      const validation = validateCategory({ 
        name: 'temp', // Temporary to pass validation
        ...data 
      })
      
      if (!validation.isValid) {
        throw new AppError(JSON.stringify(validation.errors), 400)
      }
      
      // If name is being updated, check for duplicates
      if (data.name) {
        const existing = await this.getByName(data.name)
        if (existing && existing.id !== categoryId) {
          throw new AppError('Category with this name already exists', 400)
        }
      }
      
      const { data: updated, error } = await this.supabase
        .from('categories')
        .update({
          ...data,
          updated_at: new Date().toISOString()
        })
        .eq('id', categoryId)
        .eq('user_id', this.userId)
        .select()
        .single()
      
      if (error) {
        throw new AppError(error.message, 400)
      }
      
      return updated
    } catch (error) {
      logger.error('Category update failed', error, { userId: this.userId, categoryId, data })
      throw error
    }
  }

  // Delete category (soft delete by setting is_active = false)
  async delete(categoryId) {
    try {
      // Verify ownership
      await this.getById(categoryId)
      
      // Check if category has expenses
      const { count, error: countError } = await this.supabase
        .from('expenses')
        .select('*', { count: 'exact', head: true })
        .eq('category_id', categoryId)
        .eq('user_id', this.userId)
      
      if (countError) {
        throw new AppError(countError.message, 400)
      }
      
      if (count > 0) {
        // Soft delete - just mark as inactive
        const { data, error } = await this.supabase
          .from('categories')
          .update({ 
            is_active: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', categoryId)
          .eq('user_id', this.userId)
          .select()
          .single()
        
        if (error) throw new AppError(error.message, 400)
        
        return { 
          success: true, 
          message: 'Category deactivated (has existing expenses)',
          category: data 
        }
      } else {
        // Hard delete - no expenses, safe to remove
        const { error } = await this.supabase
          .from('categories')
          .delete()
          .eq('id', categoryId)
          .eq('user_id', this.userId)
        
        if (error) throw new AppError(error.message, 400)
        
        return { success: true, message: 'Category permanently deleted' }
      }
    } catch (error) {
      logger.error('Category deletion failed', error, { userId: this.userId, categoryId })
      throw error
    }
  }

  // Add field to category
  async addField(categoryId, fieldData) {
    try {
      // Verify category ownership
      await this.getById(categoryId)
      
      const validation = validateCategoryField(fieldData)
      if (!validation.isValid) {
        throw new AppError(JSON.stringify(validation.errors), 400)
      }
      
      const { data, error } = await this.supabase
        .from('category_fields')
        .insert({
          category_id: categoryId,
          ...validation.data
        })
        .select()
        .single()
      
      if (error) throw new AppError(error.message, 400)
      
      return data
    } catch (error) {
      logger.error('Add field failed', error, { userId: this.userId, categoryId, fieldData })
      throw error
    }
  }

  // Update category field
  async updateField(fieldId, fieldData) {
    try {
      // Verify field belongs to user's category
      const { data: field, error: fieldError } = await this.supabase
        .from('category_fields')
        .select('category_id')
        .eq('id', fieldId)
        .single()
      
      if (fieldError || !field) {
        throw new NotFoundError('Field')
      }
      
      await this.getById(field.category_id)
      
      const validation = validateCategoryField(fieldData)
      if (!validation.isValid) {
        throw new AppError(JSON.stringify(validation.errors), 400)
      }
      
      const { data, error } = await this.supabase
        .from('category_fields')
        .update(validation.data)
        .eq('id', fieldId)
        .select()
        .single()
      
      if (error) throw new AppError(error.message, 400)
      
      return data
    } catch (error) {
      logger.error('Update field failed', error, { userId: this.userId, fieldId, fieldData })
      throw error
    }
  }

  // Delete category field
  async deleteField(fieldId) {
    try {
      // Verify field belongs to user's category
      const { data: field, error: fieldError } = await this.supabase
        .from('category_fields')
        .select('category_id')
        .eq('id', fieldId)
        .single()
      
      if (fieldError || !field) {
        throw new NotFoundError('Field')
      }
      
      await this.getById(field.category_id)
      
      const { error } = await this.supabase
        .from('category_fields')
        .delete()
        .eq('id', fieldId)
      
      if (error) throw new AppError(error.message, 400)
      
      return { success: true, message: 'Field deleted' }
    } catch (error) {
      logger.error('Delete field failed', error, { userId: this.userId, fieldId })
      throw error
    }
  }

  // Helper: Get category by name
  async getByName(name) {
    const { data } = await this.supabase
      .from('categories')
      .select('id')
      .eq('user_id', this.userId)
      .eq('name', name)
      .maybeSingle()
    
    return data
  }

  // Get category spending summary
  async getSpendingSummary(month) {
    try {
      const startDate = month
      const nextMonth = new Date(month)
      nextMonth.setMonth(nextMonth.getMonth() + 1)
      const endDate = nextMonth.toISOString().split('T')[0]
      
      const { data, error } = await this.supabase
        .from('expenses')
        .select(`
          category_id,
          amount,
          categories (
            name,
            icon,
            color
          )
        `)
        .eq('user_id', this.userId)
        .gte('expense_date', startDate)
        .lt('expense_date', endDate)
      
      if (error) throw new AppError(error.message, 400)
      
      // Group by category
      const summary = {}
      data.forEach(expense => {
        const catId = expense.category_id
        if (!summary[catId]) {
          summary[catId] = {
            category_id: catId,
            name: expense.categories?.name || 'Unknown',
            icon: expense.categories?.icon || '📦',
            color: expense.categories?.color || '#6B7280',
            total: 0,
            count: 0
          }
        }
        summary[catId].total += expense.amount
        summary[catId].count++
      })
      
      return Object.values(summary)
    } catch (error) {
      logger.error('Get spending summary failed', error, { userId: this.userId, month })
      throw error
    }
  }
}