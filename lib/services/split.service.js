import { supabase } from '@/lib/supabase/client'
import { AppError, NotFoundError } from '@/lib/utils/errors'
import { createLogger } from '@/lib/utils/logger'

const logger = createLogger('SplitService')

export class SplitService {
  constructor(userId) {
    this.userId = userId
    this.supabase = supabase.getClient()
  }

  // ============= GROUP MANAGEMENT =============

  async createGroup(data) {
    try {
      const { data: group, error } = await this.supabase
        .from('split_groups')
        .insert({
          user_id: this.userId,
          name: data.name,
          description: data.description
        })
        .select()
        .single()

      if (error) throw new AppError(error.message, 400)
      return group
    } catch (error) {
      logger.error('Failed to create group', error, { userId: this.userId, data })
      throw error
    }
  }

  async getGroups() {
    try {
      // First get all groups
      const { data: groups, error } = await this.supabase
        .from('split_groups')
        .select('*')
        .eq('user_id', this.userId)
        .order('created_at', { ascending: false })

      if (error) throw new AppError(error.message, 400)

      // For each group, get member count
      const groupsWithCounts = await Promise.all(
        groups.map(async (group) => {
          const { count, error: countError } = await this.supabase
            .from('group_members')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', group.id)

          if (countError) {
            logger.error('Failed to get member count', countError)
            return { ...group, members: [{ count: 0 }] }
          }

          return { ...group, members: [{ count: count || 0 }] }
        })
      )

      return groupsWithCounts
    } catch (error) {
      logger.error('Failed to get groups', error, { userId: this.userId })
      throw error
    }
  }

  async getGroup(groupId) {
    try {
      console.log('========== DEBUG GET GROUP ==========');
      console.log('1. Input groupId:', groupId);
      console.log('2. User ID:', this.userId);
      
      // First, let's check if ANY groups exist for this user
      const { data: allGroups, error: allGroupsError } = await this.supabase
        .from('split_groups')
        .select('id, name')
        .eq('user_id', this.userId)
      
      console.log('3. All groups for user:', allGroups);
      console.log('4. All groups error:', allGroupsError);
      
      if (allGroups && allGroups.length > 0) {
        console.log('5. Available group IDs:', allGroups.map(g => g.id));
      }

      // Now try to get the specific group
      console.log('6. Attempting to fetch group with ID:', groupId);
      
      const { data: group, error: groupError } = await this.supabase
        .from('split_groups')
        .select('*')
        .eq('id', groupId)
        .eq('user_id', this.userId)

      console.log('7. Group query result:', group);
      console.log('8. Group query error:', groupError);

      if (!group || group.length === 0) {
        console.log('9. No group found with these criteria');
        throw new NotFoundError('Group')
      }

      const foundGroup = group[0];
      console.log('10. Found group:', foundGroup);

      // Get members
      const { data: members, error: membersError } = await this.supabase
        .from('group_members')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: true })

      console.log('11. Members found:', members?.length || 0);
      if (membersError) console.log('12. Members error:', membersError);

      // Get expenses with their shares
      const { data: expenses, error: expensesError } = await this.supabase
        .from('split_expenses')
        .select(`
          *,
          paid_by_member:group_members!paid_by(id, name),
          shares:split_shares(
            *,
            member:group_members(id, name)
          )
        `)
        .eq('group_id', groupId)
        .order('created_at', { ascending: false })

      console.log('13. Expenses found:', expenses?.length || 0);
      if (expensesError) console.log('14. Expenses error:', expensesError);

      // Calculate balances
      const balances = await this.calculateGroupBalances(groupId)
      console.log('15. Balances calculated');

      console.log('========== DEBUG END ==========');

      return {
        ...foundGroup,
        members: members || [],
        expenses: expenses || [],
        balances
      }
    } catch (error) {
      console.log('========== DEBUG ERROR ==========');
      console.log('Error name:', error.name);
      console.log('Error message:', error.message);
      console.log('Error stack:', error.stack);
      logger.error('Failed to get group', error, { userId: this.userId, groupId })
      throw error
    }
  }

  async updateGroup(groupId, data) {
    try {
      const { data: group, error } = await this.supabase
        .from('split_groups')
        .update({
          name: data.name,
          description: data.description,
          updated_at: new Date().toISOString()
        })
        .eq('id', groupId)
        .eq('user_id', this.userId)
        .select()
        .single()

      if (error) throw new AppError(error.message, 400)
      return group
    } catch (error) {
      logger.error('Failed to update group', error, { userId: this.userId, groupId })
      throw error
    }
  }

  async deleteGroup(groupId) {
    try {
      // First delete all shares (they will cascade, but better to be explicit)
      const { data: expenses, error: expensesError } = await this.supabase
        .from('split_expenses')
        .select('id')
        .eq('group_id', groupId)

      if (!expensesError && expenses) {
        for (const expense of expenses) {
          await this.supabase
            .from('split_shares')
            .delete()
            .eq('split_expense_id', expense.id)
        }
      }

      // Delete expenses
      await this.supabase
        .from('split_expenses')
        .delete()
        .eq('group_id', groupId)

      // Delete members
      await this.supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)

      // Delete group
      const { error } = await this.supabase
        .from('split_groups')
        .delete()
        .eq('id', groupId)
        .eq('user_id', this.userId)

      if (error) throw new AppError(error.message, 400)
      return { success: true }
    } catch (error) {
      logger.error('Failed to delete group', error, { userId: this.userId, groupId })
      throw error
    }
  }

  // ============= MEMBER MANAGEMENT =============

  async addMember(groupId, data) {
    try {
      // Verify group exists
      await this.verifyGroupOwnership(groupId)

      const { data: member, error } = await this.supabase
        .from('group_members')
        .insert({
          group_id: groupId,
          user_id: this.userId,
          name: data.name,
          email: data.email,
          phone: data.phone
        })
        .select()
        .single()

      if (error) {
        if (error.code === '23505') {
          throw new AppError('Member with this email already exists in group', 400)
        }
        throw new AppError(error.message, 400)
      }

      return member
    } catch (error) {
      logger.error('Failed to add member', error, { userId: this.userId, groupId, data })
      throw error
    }
  }

  async addMembers(groupId, members) {
    try {
      await this.verifyGroupOwnership(groupId)

      const membersToInsert = members.map(m => ({
        group_id: groupId,
        user_id: this.userId,
        name: m.name,
        email: m.email,
        phone: m.phone
      }))

      const { data, error } = await this.supabase
        .from('group_members')
        .insert(membersToInsert)
        .select()

      if (error) throw new AppError(error.message, 400)
      return data
    } catch (error) {
      logger.error('Failed to add members', error, { userId: this.userId, groupId })
      throw error
    }
  }

  async updateMember(memberId, data) {
    try {
      await this.verifyMemberOwnership(memberId)

      const { data: member, error } = await this.supabase
        .from('group_members')
        .update({
          name: data.name,
          email: data.email,
          phone: data.phone
        })
        .eq('id', memberId)
        .select()
        .single()

      if (error) throw new AppError(error.message, 400)
      return member
    } catch (error) {
      logger.error('Failed to update member', error, { userId: this.userId, memberId })
      throw error
    }
  }

  async removeMember(memberId) {
    try {
      await this.verifyMemberOwnership(memberId)

      // Check if member has any unpaid shares
      const { data: shares, error: sharesError } = await this.supabase
        .from('split_shares')
        .select('*')
        .eq('member_id', memberId)
        .eq('settled', false)

      if (sharesError) throw new AppError(sharesError.message, 400)
      
      if (shares && shares.length > 0) {
        throw new AppError('Cannot remove member with unsettled expenses', 400)
      }

      const { error } = await this.supabase
        .from('group_members')
        .delete()
        .eq('id', memberId)

      if (error) throw new AppError(error.message, 400)
      return { success: true }
    } catch (error) {
      logger.error('Failed to remove member', error, { userId: this.userId, memberId })
      throw error
    }
  }

  // ============= EXPENSE SPLITTING =============

  async createSplitExpense(data) {
    try {
      await this.verifyGroupOwnership(data.group_id)

      // Get all group members
      const { data: members, error: membersError } = await this.supabase
        .from('group_members')
        .select('id, name')
        .eq('group_id', data.group_id)

      if (membersError) throw new AppError(membersError.message, 400)
      if (!members || members.length === 0) {
        throw new AppError('Group has no members', 400)
      }

      // Calculate shares based on split type
      let shares = []
      
      switch (data.split_type) {
        case 'equal':
          const amountPerPerson = Number((data.total_amount / members.length).toFixed(2))
          const lastPersonAmount = data.total_amount - (amountPerPerson * (members.length - 1))
          
          shares = members.map((m, index) => ({
            member_id: m.id,
            amount: index === members.length - 1 ? lastPersonAmount : amountPerPerson,
            settled: false
          }))
          break
          
        case 'percentage':
          if (!data.percentages || data.percentages.length !== members.length) {
            throw new AppError('Invalid percentages', 400)
          }
          const totalPercentage = data.percentages.reduce((sum, p) => sum + p, 0)
          if (Math.abs(totalPercentage - 100) > 0.01) {
            throw new AppError('Percentages must sum to 100', 400)
          }
          
          shares = members.map((m, i) => ({
            member_id: m.id,
            amount: Number(((data.total_amount * data.percentages[i]) / 100).toFixed(2)),
            percentage: data.percentages[i],
            settled: false
          }))
          break
          
        case 'custom':
          if (!data.amounts || data.amounts.length !== members.length) {
            throw new AppError('Invalid custom amounts', 400)
          }
          const totalAmounts = data.amounts.reduce((sum, a) => sum + a, 0)
          if (Math.abs(totalAmounts - data.total_amount) > 0.01) {
            throw new AppError('Custom amounts must sum to total amount', 400)
          }
          
          shares = members.map((m, i) => ({
            member_id: m.id,
            amount: Number(data.amounts[i].toFixed(2)),
            settled: false
          }))
          break
          
        default:
          throw new AppError('Invalid split type', 400)
      }

      // Create the split expense
      const { data: splitExpense, error: expenseError } = await this.supabase
        .from('split_expenses')
        .insert({
          user_id: this.userId,
          group_id: data.group_id,
          expense_id: data.expense_id,
          description: data.description,
          total_amount: data.total_amount,
          paid_by: data.paid_by,
          split_type: data.split_type
        })
        .select()
        .single()

      if (expenseError) throw new AppError(expenseError.message, 400)

      // Create shares
      const sharesToInsert = shares.map(s => ({
        ...s,
        split_expense_id: splitExpense.id
      }))

      const { data: createdShares, error: sharesError } = await this.supabase
        .from('split_shares')
        .insert(sharesToInsert)
        .select()

      if (sharesError) throw new AppError(sharesError.message, 400)

      return {
        ...splitExpense,
        shares: createdShares
      }
    } catch (error) {
      logger.error('Failed to create split expense', error, { userId: this.userId, data })
      throw error
    }
  }

  async getGroupExpenses(groupId) {
    try {
      await this.verifyGroupOwnership(groupId)

      const { data, error } = await this.supabase
        .from('split_expenses')
        .select(`
          *,
          paid_by_member:group_members!paid_by(id, name),
          shares:split_shares(
            *,
            member:group_members(id, name)
          )
        `)
        .eq('group_id', groupId)
        .order('created_at', { ascending: false })

      if (error) throw new AppError(error.message, 400)
      return data
    } catch (error) {
      logger.error('Failed to get group expenses', error, { userId: this.userId, groupId })
      throw error
    }
  }

  async settleShare(shareId) {
    try {
      // Get share details
      const { data: share, error: shareError } = await this.supabase
        .from('split_shares')
        .select(`
          *,
          split_expense:split_expenses!inner(
            group_id,
            user_id
          )
        `)
        .eq('id', shareId)
        .single()

      if (shareError || !share) throw new NotFoundError('Share')
      
      // Verify ownership
      if (share.split_expense.user_id !== this.userId) {
        throw new AppError('Unauthorized', 401)
      }

      // Mark as settled
      const { data, error } = await this.supabase
        .from('split_shares')
        .update({
          settled: true,
          settled_at: new Date().toISOString()
        })
        .eq('id', shareId)
        .select()
        .single()

      if (error) throw new AppError(error.message, 400)

      // Check if all shares for this expense are settled
      const { data: allShares, error: allError } = await this.supabase
        .from('split_shares')
        .select('settled')
        .eq('split_expense_id', share.split_expense_id)

      if (!allError) {
        const allSettled = allShares.every(s => s.settled)
        if (allSettled) {
          await this.supabase
            .from('split_expenses')
            .update({ settled: true })
            .eq('id', share.split_expense_id)
        }
      }

      return data
    } catch (error) {
      logger.error('Failed to settle share', error, { userId: this.userId, shareId })
      throw error
    }
  }

  async settleExpense(expenseId) {
    try {
      // Get expense details
      const { data: expense, error: expenseError } = await this.supabase
        .from('split_expenses')
        .select('*')
        .eq('id', expenseId)
        .single()

      if (expenseError || !expense) throw new NotFoundError('Expense')
      
      // Verify ownership
      if (expense.user_id !== this.userId) {
        throw new AppError('Unauthorized', 401)
      }

      // Mark all shares as settled
      const { error } = await this.supabase
        .from('split_shares')
        .update({
          settled: true,
          settled_at: new Date().toISOString()
        })
        .eq('split_expense_id', expenseId)

      if (error) throw new AppError(error.message, 400)

      // Mark expense as settled
      const { data, error: updateError } = await this.supabase
        .from('split_expenses')
        .update({ settled: true })
        .eq('id', expenseId)
        .select()
        .single()

      if (updateError) throw new AppError(updateError.message, 400)

      return data
    } catch (error) {
      logger.error('Failed to settle expense', error, { userId: this.userId, expenseId })
      throw error
    }
  }

  // ============= BALANCE CALCULATIONS =============

  async calculateGroupBalances(groupId) {
    try {
      // Get all expenses and shares
      const { data: expenses, error } = await this.supabase
        .from('split_expenses')
        .select(`
          paid_by,
          shares:split_shares(
            member_id,
            amount,
            settled
          )
        `)
        .eq('group_id', groupId)

      if (error) throw new AppError(error.message, 400)

      // Get all members
      const { data: members } = await this.supabase
        .from('group_members')
        .select('id, name')
        .eq('group_id', groupId)

      if (!members) return {}

      // Initialize balances
      const balances = {}
      members.forEach(m => {
        balances[m.id] = {
          name: m.name,
          paid: 0,
          owes: 0,
          net: 0,
          pending: []
        }
      })

      // Calculate balances
      expenses?.forEach(expense => {
        expense.shares?.forEach(share => {
          if (share.member_id === expense.paid_by) {
            // Person paid, so they are owed money
            if (balances[share.member_id]) {
              balances[share.member_id].paid += share.amount
            }
          } else {
            // Person owes money
            if (balances[share.member_id]) {
              balances[share.member_id].owes += share.amount
              
              if (!share.settled) {
                const paidByMember = members.find(m => m.id === expense.paid_by)
                balances[share.member_id].pending.push({
                  to: paidByMember?.name || 'Unknown',
                  amount: share.amount
                })
              }
            }
          }
        })
      })

      // Calculate net
      Object.keys(balances).forEach(id => {
        balances[id].net = Number((balances[id].paid - balances[id].owes).toFixed(2))
      })

      return balances
    } catch (error) {
      logger.error('Failed to calculate balances', error, { userId: this.userId, groupId })
      throw error
    }
  }

  async getPendingSummary() {
    try {
      const groups = await this.getGroups()
      const summary = {
        totalPending: 0,
        groups: []
      }

      for (const group of groups) {
        const balances = await this.calculateGroupBalances(group.id)
        const groupPending = Object.values(balances).reduce((sum, b) => sum + b.owes, 0)
        
        summary.totalPending += groupPending
        summary.groups.push({
          id: group.id,
          name: group.name,
          pendingAmount: groupPending,
          memberCount: group.members,
          balances
        })
      }

      return summary
    } catch (error) {
      logger.error('Failed to get pending summary', error, { userId: this.userId })
      throw error
    }
  }

  // ============= HELPER METHODS =============

  async verifyGroupOwnership(groupId) {
    const { data, error } = await this.supabase
      .from('split_groups')
      .select('user_id')
      .eq('id', groupId)
      .single()

    if (error || !data) throw new NotFoundError('Group')
    if (data.user_id !== this.userId) throw new AppError('Unauthorized', 401)
  }

  async verifyMemberOwnership(memberId) {
    const { data, error } = await this.supabase
      .from('group_members')
      .select('group_id')
      .eq('id', memberId)
      .single()

    if (error || !data) throw new NotFoundError('Member')
    await this.verifyGroupOwnership(data.group_id)
  }
}