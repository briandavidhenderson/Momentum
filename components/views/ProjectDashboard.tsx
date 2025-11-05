"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { useAppContext } from "@/lib/AppContext"
import { Button } from "@/components/ui/button"
import { GanttChart } from "@/components/GanttChart"
import { Project, Task, Person, ImportanceLevel, Order, OrderStatus, InventoryItem, InventoryLevel, FUNDING_ACCOUNTS, CATEGORIES, PersonProfile, Deliverable, User, Workpackage, ProfileProject, CalendarEvent, Subtask, EquipmentDevice, LabPoll, ELNExperiment, MasterProject } from "@/lib/types"
import { DayToDayTask } from "@/lib/dayToDayTypes"
import ViewSwitcher from "@/components/ViewSwitcher"
import { DeliverablesWidget } from "@/components/DeliverablesWidget"
import { UpcomingEventsPanel } from "@/components/UpcomingEventsPanel"
import { EventDialog } from "@/components/EventDialog"
import { DeletionConfirmationDialog } from "@/components/DeletionConfirmationDialog"
import { EquipmentStatusPanel } from "@/components/EquipmentStatusPanel"
import { LabPollPanel } from "@/components/LabPollPanel"
import { TaskDetailPanel } from "@/components/TaskDetailPanel"
import { calculateDeletionImpact, deleteMasterProject, deleteRegularProject, DeletionImpact } from "@/lib/projectDeletion"
import { profiles } from "@/lib/profiles"
import { useProfiles } from "@/lib/useProfiles"
import { personProfilesToPeople, getPersonDisplayName, findPersonProfileById } from "@/lib/personHelpers"
import { Task as GanttTask } from "gantt-task-react"
import { Plus, Users, Trash2, Check, X, GripVertical, Edit, Package, Maximize2, LogOut, ChevronDown, ChevronRight, FileText } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragMoveEvent,
  pointerWithin,
} from "@dnd-kit/core"
import {
  useDraggable,
  useDroppable,
} from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"

export function ProjectDashboard() {
    // Get all state and handlers from context
    const {
        projects,
        workpackages,
        people,
        visibleProjects,
        currentUserProfile,
        currentUserProfileId,
        polls,
        upcomingEvents,
        inventory,
        orders,
        equipment,
        dayToDayTasks,
        handleQuickCreateProject,
        handleGanttContextAction,
        handleDateChange,
        handleTaskClick,
        handlePersonDropOnBar,
        handleToggleExpand,
        handleProjectNameChange,
        handleDeleteProject,
        handleProjectImportanceChange,
        handleProjectNotesChange,
        handleTaskNameChange,
        handleDeleteTask,
        handleTaskRemoveAssignee,
        handleTaskImportanceChange,
        handleTaskNotesChange,
        handleAddTask,
        handleAddWorkpackage,
        handleAddTaskToWorkpackage,
        handleWorkpackageNameChange,
        handleToggleProjectExpand,
        handleToggleWorkpackageExpand,
        handleToggleTaskExpand,
        handleUpdateDeliverables,
        handleTaskNameChangeInWorkpackage,
        handleTaskDeleteFromWorkpackage,
        handleTaskRemoveAssigneeFromWorkpackage,
        handleTaskImportanceChangeInWorkpackage,
        handleTaskNotesChangeInWorkpackage,
        handleCreateOrder,
        handleDeleteOrder,
        handleOrderClick,
        removeDuplicateInventory,
        handleUpdateInventoryLevel,
        handleReorder,
        setActiveTab,
        activeTab,
        toOrderOrders,
        orderedOrders,
        receivedOrders,
        getPersonName,
        getImportanceBadge,
        createLabPoll,
        updateLabPoll,
        deleteLabPoll,
        handleCreateEvent,
        handleSelectEvent,
        DraggablePerson,
        DroppableProject,
        DroppableOrderColumn,
        InlineEdit,
        ImportanceSelector,
        DroppableTask,
        OrderDialog,
        handleSaveOrder,
        orderDialogOpen,
        editingOrder,
        setOrderDialogOpen,
        setEditingOrder,
        createEquipment,
        updateEquipment,
        setEquipment,
        setInventory,
        setOrders,
        createDayToDayTask,
        setDayToDayTasks,
    } = useAppContext()

    // Type assertions for arrays to help TypeScript
    const typedPolls = polls as LabPoll[]
    const typedPeople = people as Person[]
    const typedProjects = projects as Project[]
    const typedWorkpackages = workpackages as Workpackage[]
    const typedVisibleProjects = visibleProjects as Project[]
    const typedInventory = inventory as InventoryItem[]
    const typedOrders = orders as Order[]
    const typedEquipment = equipment as EquipmentDevice[]

    return (
        <>
          {/* Lab Polls and Upcoming Events */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Lab Polls Panel */}
            {currentUserProfile && (
              <LabPollPanel
                polls={polls}
                currentUserProfile={currentUserProfile}
                people={people}
                onCreatePoll={async (newPoll) => {
                  try {
                    const { id, ...pollData } = newPoll
                    await createLabPoll(pollData)
                    // Firestore subscription will update state
                  } catch (error) {
                    console.error("Error creating poll:", error)
                    alert("Failed to create poll. Please try again.")
                  }
                }}
                onRespondToPoll={async (pollId, optionIds) => {
                  try {
                    const poll = typedPolls.find(p => p.id === pollId)
                    if (!poll) return
                    
                    const existingResponseIndex = poll.responses?.findIndex(r => r.userId === currentUserProfile?.id) ?? -1
                    const newResponse = {
                      userId: currentUserProfile?.id || '',
                      selectedOptionIds: optionIds,
                      respondedAt: new Date().toISOString(),
                    }
                    
                    const updatedResponses = poll.responses || []
                    if (existingResponseIndex >= 0) {
                      updatedResponses[existingResponseIndex] = newResponse
                    } else {
                      updatedResponses.push(newResponse)
                    }
                    
                    await updateLabPoll(pollId, { responses: updatedResponses })
                    // Firestore subscription will update state
                  } catch (error) {
                    console.error("Error responding to poll:", error)
                    alert("Failed to update poll response. Please try again.")
                  }
                }}
                onDeletePoll={async (pollId) => {
                  if (confirm("Are you sure you want to delete this poll?")) {
                    try {
                      await deleteLabPoll(pollId)
                      // Firestore subscription will update state
                    } catch (error) {
                      console.error("Error deleting poll:", error)
                      alert("Failed to delete poll. Please try again.")
                    }
                  }
                }}
              />
            )}
            
            {/* Upcoming Events Panel */}
            <UpcomingEventsPanel
              events={upcomingEvents}
              onCreateEvent={handleCreateEvent}
              onSelectEvent={handleSelectEvent}
              getPersonName={getPersonName}
            />
          </div>

          {/* Master Projects View Switcher */}
          {currentUserProfile && (
            <ViewSwitcher
              currentProfile={currentUserProfile}
              onViewChange={(view) => {
                console.log("View changed to:", view)
              }}
            />
          )}

          {/* Top Section: Team Members + Gantt Chart */}
          <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr] gap-4">
            {/* Team Members - From JSON Profiles */}
            <div className="card-monday hidden xl:block">
              <h2 className="text-lg font-bold text-foreground mb-3">Lab Personnel</h2>
              <p className="text-xs text-muted-foreground mb-3">
                Drag to assign to projects & tasks
              </p>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {people.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8 text-sm">
                    No team members found.
                  </p>
                ) : (
                  typedPeople.map((person) => {
                    const profile = profiles.find(p => p.id === person.id)
                    return (
                      <div key={person.id} className="relative">
                        <DraggablePerson person={person} />
                        {profile && (
                          <div className="mt-1 px-3 text-xs text-muted-foreground">
                            <div className="font-medium truncate">{profile.position}</div>
                            <div className="truncate">{profile.lab}</div>
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* Gantt Chart */}
            <div className="card-monday">
              <GanttChart 
                projects={visibleProjects}
                workpackages={workpackages}
                people={people}
                onDateChange={handleDateChange}
                onTaskClick={handleTaskClick}
                onPersonDropOnBar={handlePersonDropOnBar}
                onToggleExpand={handleToggleExpand}
                onContextAction={handleGanttContextAction}
              />
            </div>
          </div>

          {/* Bottom Section: Projects & Tasks + Orders */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Projects List */}
            <div className="card-monday">
              <div className="flex items-center justify-between mb-6">
                <h2 className="h2 text-foreground">
                  Master Projects & Workpackages
                  {currentUserProfileId && (
                    <span className="text-sm font-normal text-muted-foreground ml-2">
                      ({visibleProjects.length})
                    </span>
                  )}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Master projects from profiles appear here. Add workpackages to break down work.
                </p>
              </div>
              <div className="space-y-4">
                {visibleProjects.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground mb-4">
                      {currentUserProfileId
                        ? "No projects found for this user. Add projects in Profile Management or assign them to tasks."
                        : "No projects yet. Click the button above to create your first project!"}
                    </p>
                  </div>
                ) : (
                  typedVisibleProjects.map((project) => (
                    <DroppableProject
                      key={project.id}
                      project={project}
                      onNameChange={(newName: string) => handleProjectNameChange(project.id, newName)}
                      onDelete={() => handleDeleteProject(project.id)}
                      onImportanceChange={(importance: ImportanceLevel) => handleProjectImportanceChange(project.id, importance)}
                      onNotesChange={(notes: string) => handleProjectNotesChange(project.id, notes)}
                      getPersonName={getPersonName}
                      getImportanceBadge={getImportanceBadge}
                      onTaskNameChange={(taskId: string, newName: string) => handleTaskNameChange(project.id, taskId, newName)}
                      onTaskDelete={(taskId: string) => handleDeleteTask(project.id, taskId)}
                      onTaskRemoveAssignee={(taskId: string, personId: string) => handleTaskRemoveAssignee(project.id, taskId, personId)}
                      onTaskImportanceChange={(taskId: string, importance: ImportanceLevel) => handleTaskImportanceChange(project.id, taskId, importance)}
                      onTaskNotesChange={(taskId: string, notes: string) => handleTaskNotesChange(project.id, taskId, notes)}
                      people={people}
                      onAddTask={() => handleAddTask(project.id)}
                      workpackages={workpackages}
                      onAddWorkpackage={() => handleAddWorkpackage(project.id)}
                      onAddTaskToWorkpackage={handleAddTaskToWorkpackage}
                      onWorkpackageNameChange={handleWorkpackageNameChange}
                      onToggleProjectExpand={handleToggleProjectExpand}
                      onToggleWorkpackageExpand={handleToggleWorkpackageExpand}
                      onToggleTaskExpand={handleToggleTaskExpand}
                      onUpdateDeliverables={handleUpdateDeliverables}
                      onWpTaskNameChange={handleTaskNameChangeInWorkpackage}
                      onWpTaskDelete={handleTaskDeleteFromWorkpackage}
                      onWpTaskRemoveAssignee={handleTaskRemoveAssigneeFromWorkpackage}
                      onWpTaskImportanceChange={handleTaskImportanceChangeInWorkpackage}
                      onWpTaskNotesChange={handleTaskNotesChangeInWorkpackage}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Orders & Inventory Panel */}
            <div className="card-monday">
              <div className="flex items-center justify-between mb-6">
                <h2 className="h2 text-foreground">Orders & Inventory</h2>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setActiveTab('orders')}
                    variant={activeTab === 'orders' ? 'default' : 'outline'}
                    size="sm"
                    className={activeTab === 'orders' ? 'bg-brand-500 text-white' : ''}
                  >
                    Orders
                  </Button>
                  <Button
                    onClick={() => setActiveTab('inventory')}
                    variant={activeTab === 'inventory' ? 'default' : 'outline'}
                    size="sm"
                    className={activeTab === 'inventory' ? 'bg-brand-500 text-white' : ''}
                  >
                    Inventory ({inventory.length})
                  </Button>
                  {activeTab === 'inventory' && inventory.length > 0 && (
                    <Button
                      onClick={removeDuplicateInventory}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      title="Remove duplicate inventory entries"
                    >
                      Clean Duplicates
                    </Button>
                  )}
                  <Button
                    onClick={handleCreateOrder}
                    className="bg-brand-500 hover:bg-brand-600 text-white"
                    size="sm"
                  >
                    <Package className="mr-2 h-4 w-4" />
                    New Order
                  </Button>
                </div>
              </div>

              {activeTab === 'orders' ? (
                <>
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    <DroppableOrderColumn
                      status="to-order"
                      title="To Order"
                      orders={toOrderOrders}
                      people={people}
                      onDeleteOrder={handleDeleteOrder}
                      onOrderClick={handleOrderClick}
                    />
                    <DroppableOrderColumn
                      status="ordered"
                      title="Ordered"
                      orders={orderedOrders}
                      people={people}
                      onDeleteOrder={handleDeleteOrder}
                      onOrderClick={handleOrderClick}
                    />
                    <DroppableOrderColumn
                      status="received"
                      title="Received"
                      orders={receivedOrders}
                      people={people}
                      onDeleteOrder={handleDeleteOrder}
                      onOrderClick={handleOrderClick}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-4 text-center">
                    Items in &quot;Received&quot; will auto-remove after 7 days and be added to inventory
                  </p>
                </>
              ) : (
                <div className="space-y-6 overflow-x-auto">
                  {inventory.length === 0 ? (
                    <p className="text-muted-foreground text-center py-12">
                      No inventory items yet. Received orders will appear here automatically.
                    </p>
                  ) : (
                    <>
                      {CATEGORIES.map((category) => {
                        const categoryItems = typedInventory.filter(item => item.category === category.id)
                        if (categoryItems.length === 0) return null

                        return (
                          <div key={category.id} className="space-y-2">
                            <div className="flex items-center gap-2 sticky top-0 bg-brand-500 text-white py-2 px-3 rounded-lg shadow-sm">
                              <span className="text-xl">{category.emoji}</span>
                              <h3 className="font-bold">{category.name}</h3>
                              <Badge className="ml-auto bg-white text-brand-600">{categoryItems.length}</Badge>
                            </div>
                            
                            <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
                              <table className="w-full text-sm min-w-[640px]">
                                <thead>
                                  <tr className="bg-gray-100 border-b border-border">
                                    <th className="text-left p-2 font-semibold text-foreground">Product Name</th>
                                    <th className="text-left p-2 font-semibold text-foreground hidden md:table-cell">CAT#</th>
                                    <th className="text-left p-2 font-semibold text-foreground min-w-[120px]">Level</th>
                                    <th className="text-left p-2 font-semibold text-foreground hidden lg:table-cell">Account</th>
                                    <th className="text-right p-2 font-semibold text-foreground hidden md:table-cell">Price</th>
                                    <th className="text-center p-2 font-semibold text-foreground">Actions</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {categoryItems.map((item, idx) => {
                                    const account = FUNDING_ACCOUNTS.find(a => a.id === item.chargeToAccount)
                                    const levelPercentage = {
                                      empty: 0,
                                      low: 25,
                                      medium: 60,
                                      full: 100
                                    }[item.inventoryLevel]
                                    const levelColor = {
                                      empty: "#ef4444",
                                      low: "#f97316",
                                      medium: "#eab308",
                                      full: "#22c55e"
                                    }[item.inventoryLevel]
                                    
                                    return (
                                      <tr key={item.id} className={`border-b border-border hover:bg-gray-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                                        <td className="p-2">
                                          <div className="font-medium text-foreground">{item.productName}</div>
                                          {item.subcategory && (
                                            <div className="text-xs text-muted-foreground">{item.subcategory}</div>
                                          )}
                                        </td>
                                        <td className="p-2 font-mono text-xs text-muted-foreground hidden md:table-cell">{item.catNum}</td>
                                        <td className="p-2">
                                          <div className="space-y-1">
                                            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                                              <div
                                                className="h-full transition-all duration-300 flex items-center justify-center text-[10px] font-bold text-white"
                                                style={{ width: `${levelPercentage}%`, backgroundColor: levelColor }}
                                              >
                                                {levelPercentage > 20 && `${levelPercentage}%`}
                                              </div>
                                            </div>
                                            <select
                                              value={item.inventoryLevel}
                                              onChange={(e) => handleUpdateInventoryLevel(item.id, e.target.value as InventoryLevel)}
                                              className="w-full text-xs px-1 py-0.5 rounded border border-border bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                                            >
                                              <option value="empty">Empty</option>
                                              <option value="low">Low</option>
                                              <option value="medium">Medium</option>
                                              <option value="full">Full</option>
                                            </select>
                                          </div>
                                        </td>
                                        <td className="p-2 text-xs text-muted-foreground hidden lg:table-cell">
                                          {account ? `${account.name}` : "-"}
                                        </td>
                                        <td className="p-2 text-right font-semibold text-foreground hidden md:table-cell">
                                          £{item.priceExVAT?.toFixed(2) || "0.00"}
                                        </td>
                                        <td className="p-2 text-center">
                                          <Button
                                            onClick={() => handleReorder(item)}
                                            className="bg-brand-500 hover:bg-brand-600 text-white h-7 px-3"
                                            size="sm"
                                          >
                                            <Package className="h-3 w-3 mr-1" />
                                            Reorder
                                          </Button>
                                        </td>
                                      </tr>
                                    )
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )
                      })}
                      
                      {/* Show uncategorized items */}
                      {typedInventory.filter(item => !item.category).length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 sticky top-0 bg-gray-500 text-white py-2 px-3 rounded-lg shadow-sm">
                            <span className="text-xl">📦</span>
                            <h3 className="font-bold">Uncategorized</h3>
                            <Badge className="ml-auto bg-white text-gray-700">{typedInventory.filter(item => !item.category).length}</Badge>
                          </div>
                          
                          <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
                            <table className="w-full text-sm min-w-[640px]">
                              <thead>
                                <tr className="bg-gray-100 border-b border-border">
                                  <th className="text-left p-2 font-semibold text-foreground">Product Name</th>
                                  <th className="text-left p-2 font-semibold text-foreground hidden md:table-cell">CAT#</th>
                                  <th className="text-left p-2 font-semibold text-foreground min-w-[120px]">Level</th>
                                  <th className="text-left p-2 font-semibold text-foreground hidden lg:table-cell">Account</th>
                                  <th className="text-right p-2 font-semibold text-foreground hidden md:table-cell">Price</th>
                                  <th className="text-center p-2 font-semibold text-foreground">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {typedInventory.filter(item => !item.category).map((item, idx) => {
                                  const account = FUNDING_ACCOUNTS.find(a => a.id === item.chargeToAccount)
                                  const levelPercentage = {
                                    empty: 0,
                                    low: 25,
                                    medium: 60,
                                    full: 100
                                  }[item.inventoryLevel]
                                  const levelColor = {
                                    empty: "#ef4444",
                                    low: "#f97316",
                                    medium: "#eab308",
                                    full: "#22c55e"
                                  }[item.inventoryLevel]
                                  
                                  return (
                                    <tr key={item.id} className={`border-b border-border hover:bg-gray-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                                      <td className="p-2 font-medium text-foreground">{item.productName}</td>
                                      <td className="p-2 font-mono text-xs text-muted-foreground hidden md:table-cell">{item.catNum}</td>
                                      <td className="p-2">
                                        <div className="space-y-1">
                                          <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                                            <div
                                              className="h-full transition-all duration-300 flex items-center justify-center text-[10px] font-bold text-white"
                                              style={{ width: `${levelPercentage}%`, backgroundColor: levelColor }}
                                            >
                                              {levelPercentage > 20 && `${levelPercentage}%`}
                                            </div>
                                          </div>
                                          <select
                                            value={item.inventoryLevel}
                                            onChange={(e) => handleUpdateInventoryLevel(item.id, e.target.value as InventoryLevel)}
                                            className="w-full text-xs px-1 py-0.5 rounded border border-border bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                                          >
                                            <option value="empty">Empty</option>
                                            <option value="low">Low</option>
                                            <option value="medium">Medium</option>
                                            <option value="full">Full</option>
                                          </select>
                                        </div>
                                      </td>
                                      <td className="p-2 text-xs text-muted-foreground hidden lg:table-cell">
                                        {account ? `${account.name}` : "-"}
                                      </td>
                                      <td className="p-2 text-right font-semibold text-foreground hidden md:table-cell">
                                        £{item.priceExVAT?.toFixed(2) || "0.00"}
                                      </td>
                                      <td className="p-2 text-center">
                                        <Button
                                          onClick={() => handleReorder(item)}
                                          className="bg-brand-500 hover:bg-brand-600 text-white h-7 px-3"
                                          size="sm"
                                        >
                                          <Package className="h-3 w-3 mr-1" />
                                          Reorder
                                        </Button>
                                      </td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
            
            {/* Equipment Status Panel */}
            {currentUserProfile && (
              <EquipmentStatusPanel
                equipment={equipment}
                inventory={inventory}
                orders={orders}
                masterProjects={(currentUserProfile?.projects || []).map((pp: ProfileProject) => ({
                  id: pp.id,
                  name: pp.name,
                  description: pp.description,
                  labId: currentUserProfile?.lab || '',
                  labName: currentUserProfile?.lab || '',
                  instituteId: currentUserProfile?.institute || '',
                  instituteName: currentUserProfile?.institute || '',
                  organisationId: currentUserProfile?.organisation || '',
                  organisationName: currentUserProfile?.organisation || '',
                  grantName: pp.grantName,
                  grantNumber: pp.grantNumber,
                  totalBudget: pp.budget,
                  currency: "GBP",
                  startDate: pp.startDate,
                  endDate: pp.endDate,
                  funderId: pp.fundedBy?.[0] || '',
                  funderName: '',
                  accountIds: pp.fundedBy || [],
                  principalInvestigatorIds: pp.principalInvestigatorId ? [pp.principalInvestigatorId] : [],
                  coPIIds: [],
                  teamMemberIds: [],
                  teamRoles: {},
                  workpackageIds: [],
                  status: pp.status as any || 'active',
                  progress: 0,
                  visibility: pp.visibility as any || 'lab',
                  tags: pp.tags,
                  notes: pp.notes,
                  createdAt: new Date().toISOString(),
                  createdBy: currentUserProfile?.userId || currentUserProfile?.id || '',
                } as MasterProject))}
                currentUserProfile={currentUserProfile}
                onEquipmentUpdate={async (updatedEquipment) => {
                  try {
                    // Create or update each equipment item in Firestore
                    const promises = updatedEquipment.map(async (eq) => {
                      // Check if this is a new device (not in existing equipment array)
                      const existingDevice = typedEquipment.find(e => e.id === eq.id)

                      if (!existingDevice) {
                        // New device - create it
                        const { id, ...deviceData } = eq
                        await createEquipment(deviceData)
                      } else {
                        // Existing device - update it
                        await updateEquipment(eq.id, eq)
                      }
                    })
                    await Promise.all(promises)
                    // Firestore subscription will update state
                  } catch (error) {
                    console.error("Error creating/updating equipment:", error)
                    alert("Failed to save equipment. Please try again.")
                    // Fallback to local state
                    setEquipment(updatedEquipment)
                  }
                }}
                onInventoryUpdate={setInventory}
                onOrderCreate={(newOrder) => {
                  setOrders([...orders, newOrder])
                }}
                onTaskCreate={async (newTask) => {
                  try {
                    await createDayToDayTask(newTask)
                    // Firestore subscription will update state
                  } catch (error) {
                    console.error("Error creating task:", error)
                    alert("Failed to create task. Please try again.")
                    // Fallback to local state
                    setDayToDayTasks([...dayToDayTasks, newTask])
                  }
                }}
              />
            )}
          </div>
        </>
    )
}