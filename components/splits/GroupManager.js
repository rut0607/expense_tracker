'use client'

import { useState, useEffect } from 'react'
import { PlusIcon, UserGroupIcon } from '@heroicons/react/24/outline'

export default function GroupsManager() {
  const [groups, setGroups] = useState([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newGroup, setNewGroup] = useState({ name: '', description: '', members: [] })
  const [newMember, setNewMember] = useState({ name: '', email: '' })

  useEffect(() => {
    loadGroups()
  }, [])

  const loadGroups = async () => {
    const res = await fetch('/api/splits/groups')
    const data = await res.json()
    if (data.success) {
      setGroups(data.data)
    }
  }

  const createGroup = async () => {
    const res = await fetch('/api/splits/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newGroup)
    })
    if (res.ok) {
      setShowCreateModal(false)
      loadGroups()
    }
  }

  const addMember = () => {
    if (newMember.name) {
      setNewGroup({
        ...newGroup,
        members: [...newGroup.members, newMember]
      })
      setNewMember({ name: '', email: '' })
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold flex items-center">
          <UserGroupIcon className="w-5 h-5 mr-2 text-blue-500" />
          Split Groups
        </h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
        >
          <PlusIcon className="w-4 h-4 inline mr-1" />
          New Group
        </button>
      </div>

      {/* Groups List */}
      <div className="space-y-3">
        {groups.map(group => (
          <div key={group.id} className="border rounded-lg p-3">
            <h3 className="font-medium">{group.name}</h3>
            <p className="text-sm text-gray-600">{group.description}</p>
            <div className="mt-2 text-xs text-gray-500">
              {group.group_members?.length || 0} members
            </div>
          </div>
        ))}
      </div>

      {/* Create Group Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Create New Group</h3>
            
            <input
              type="text"
              placeholder="Group Name"
              value={newGroup.name}
              onChange={(e) => setNewGroup({...newGroup, name: e.target.value})}
              className="w-full p-2 border rounded mb-3"
            />
            
            <textarea
              placeholder="Description (optional)"
              value={newGroup.description}
              onChange={(e) => setNewGroup({...newGroup, description: e.target.value})}
              className="w-full p-2 border rounded mb-3"
            />

            <h4 className="font-medium mb-2">Add Members</h4>
            <div className="flex space-x-2 mb-3">
              <input
                type="text"
                placeholder="Name"
                value={newMember.name}
                onChange={(e) => setNewMember({...newMember, name: e.target.value})}
                className="flex-1 p-2 border rounded"
              />
              <input
                type="email"
                placeholder="Email"
                value={newMember.email}
                onChange={(e) => setNewMember({...newMember, email: e.target.value})}
                className="flex-1 p-2 border rounded"
              />
              <button
                onClick={addMember}
                className="bg-blue-500 text-white px-3 py-2 rounded"
              >
                Add
              </button>
            </div>

            {/* Members list */}
            <div className="space-y-2 mb-4">
              {newGroup.members.map((member, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span>{member.name}</span>
                  <span className="text-gray-500">{member.email}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border rounded"
              >
                Cancel
              </button>
              <button
                onClick={createGroup}
                className="px-4 py-2 bg-blue-500 text-white rounded"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}