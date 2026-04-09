'use client'

import React, { createContext, useContext, useReducer, useCallback, useMemo } from 'react'
import type { PricingRule, DraftEntry, DraftType } from './pricing-rules-data'
import { generateSampleRules, getChangedFields, createBlankRule } from './pricing-rules-data'

interface PricingRulesState {
  rules: PricingRule[]
  drafts: DraftEntry[]
  showDeleted: boolean
  searchTerm: string
  expandedRows: Set<number>
  editingRule: PricingRule | null
  nextTempId: number
}

type Action =
  | { type: 'SET_RULES'; payload: PricingRule[] }
  | { type: 'ADD_DRAFT'; payload: DraftEntry }
  | { type: 'REMOVE_DRAFT'; payload: number }
  | { type: 'CLEAR_DRAFTS' }
  | { type: 'PUBLISH_DRAFTS' }
  | { type: 'SET_SHOW_DELETED'; payload: boolean }
  | { type: 'SET_SEARCH_TERM'; payload: string }
  | { type: 'TOGGLE_EXPANDED_ROW'; payload: number }
  | { type: 'COLLAPSE_ALL_ROWS' }
  | { type: 'SET_EDITING_RULE'; payload: PricingRule | null }
  | { type: 'UPDATE_DRAFT'; payload: { ruleId: number; updates: Partial<PricingRule> } }

function reducer(state: PricingRulesState, action: Action): PricingRulesState {
  switch (action.type) {
    case 'SET_RULES':
      return { ...state, rules: action.payload }

    case 'ADD_DRAFT': {
      // Remove existing draft for the same rule if it exists
      const filteredDrafts = state.drafts.filter(d => d.ruleId !== action.payload.ruleId)
      return { ...state, drafts: [...filteredDrafts, action.payload] }
    }

    case 'REMOVE_DRAFT':
      return { ...state, drafts: state.drafts.filter(d => d.ruleId !== action.payload) }

    case 'CLEAR_DRAFTS':
      return { ...state, drafts: [] }

    case 'PUBLISH_DRAFTS': {
      let newRules = [...state.rules]
      
      for (const draft of state.drafts) {
        switch (draft.type) {
          case 'create':
            // Assign a new positive ID for created rules
            const maxId = Math.max(...newRules.map(r => r.RuleId), 1000)
            newRules.push({ ...draft.updatedRule, RuleId: maxId + 1 })
            break
          case 'update':
          case 'toggleActive':
            newRules = newRules.map(r => 
              r.RuleId === draft.ruleId ? draft.updatedRule : r
            )
            break
          case 'delete':
            newRules = newRules.map(r => 
              r.RuleId === draft.ruleId ? { ...r, RuleIsDeleted: true } : r
            )
            break
          case 'restore':
            newRules = newRules.map(r => 
              r.RuleId === draft.ruleId ? { ...r, RuleIsDeleted: false } : r
            )
            break
        }
      }
      
      return { ...state, rules: newRules, drafts: [] }
    }

    case 'SET_SHOW_DELETED':
      return { ...state, showDeleted: action.payload }

    case 'SET_SEARCH_TERM':
      return { ...state, searchTerm: action.payload }

    case 'TOGGLE_EXPANDED_ROW': {
      const newExpanded = new Set(state.expandedRows)
      if (newExpanded.has(action.payload)) {
        newExpanded.delete(action.payload)
      } else {
        newExpanded.add(action.payload)
      }
      return { ...state, expandedRows: newExpanded }
    }

    case 'COLLAPSE_ALL_ROWS':
      return { ...state, expandedRows: new Set() }

    case 'SET_EDITING_RULE':
      return { ...state, editingRule: action.payload }

    case 'UPDATE_DRAFT': {
      const existingDraft = state.drafts.find(d => d.ruleId === action.payload.ruleId)
      if (existingDraft) {
        const updatedRule = { ...existingDraft.updatedRule, ...action.payload.updates }
        const changedFields = existingDraft.originalRule 
          ? getChangedFields(existingDraft.originalRule, updatedRule)
          : undefined
        return {
          ...state,
          drafts: state.drafts.map(d => 
            d.ruleId === action.payload.ruleId 
              ? { ...d, updatedRule, changedFields }
              : d
          )
        }
      }
      return state
    }

    default:
      return state
  }
}

const initialState: PricingRulesState = {
  rules: generateSampleRules(),
  drafts: [],
  showDeleted: false,
  searchTerm: '',
  expandedRows: new Set(),
  editingRule: null,
  nextTempId: -1,
}

interface PricingRulesContextType {
  state: PricingRulesState
  // Rule operations
  stageUpdate: (rule: PricingRule, updates: Partial<PricingRule>) => void
  stageCreate: (rule: PricingRule) => void
  stageDelete: (rule: PricingRule) => void
  stageRestore: (rule: PricingRule) => void
  stageToggleActive: (rule: PricingRule) => void
  discardDraft: (ruleId: number) => void
  discardAllDrafts: () => void
  publishDrafts: () => void
  // UI state
  setShowDeleted: (show: boolean) => void
  setSearchTerm: (term: string) => void
  toggleExpandedRow: (ruleId: number) => void
  collapseAllRows: () => void
  setEditingRule: (rule: PricingRule | null) => void
  // Helpers
  getRuleWithDraft: (ruleId: number) => PricingRule
  getDraftForRule: (ruleId: number) => DraftEntry | undefined
  hasDraft: (ruleId: number) => boolean
  createNewRule: () => PricingRule
  getDisplayRules: () => PricingRule[]
  getDraftCounts: () => { created: number; updated: number; deleted: number; restored: number }
}

const PricingRulesContext = createContext<PricingRulesContextType | null>(null)

export function PricingRulesProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  
  // Track temp IDs for new rules
  const nextTempIdRef = React.useRef(-1)

  const stageUpdate = useCallback((rule: PricingRule, updates: Partial<PricingRule>) => {
    const updatedRule = { ...rule, ...updates }
    const changedFields = getChangedFields(rule, updatedRule)
    
    // If no changes, don't create a draft
    if (changedFields.length === 0) return
    
    const draft: DraftEntry = {
      ruleId: rule.RuleId,
      type: 'update',
      originalRule: rule,
      updatedRule,
      changedFields,
    }
    dispatch({ type: 'ADD_DRAFT', payload: draft })
  }, [])

  const stageCreate = useCallback((rule: PricingRule) => {
    const draft: DraftEntry = {
      ruleId: rule.RuleId,
      type: 'create',
      updatedRule: rule,
    }
    dispatch({ type: 'ADD_DRAFT', payload: draft })
  }, [])

  const stageDelete = useCallback((rule: PricingRule) => {
    const draft: DraftEntry = {
      ruleId: rule.RuleId,
      type: 'delete',
      originalRule: rule,
      updatedRule: { ...rule, RuleIsDeleted: true },
    }
    dispatch({ type: 'ADD_DRAFT', payload: draft })
  }, [])

  const stageRestore = useCallback((rule: PricingRule) => {
    const draft: DraftEntry = {
      ruleId: rule.RuleId,
      type: 'restore',
      originalRule: rule,
      updatedRule: { ...rule, RuleIsDeleted: false },
    }
    dispatch({ type: 'ADD_DRAFT', payload: draft })
  }, [])

  const stageToggleActive = useCallback((rule: PricingRule) => {
    const updatedRule = { ...rule, Active: !rule.Active }
    const draft: DraftEntry = {
      ruleId: rule.RuleId,
      type: 'toggleActive',
      originalRule: rule,
      updatedRule,
      changedFields: ['Active'],
    }
    dispatch({ type: 'ADD_DRAFT', payload: draft })
  }, [])

  const discardDraft = useCallback((ruleId: number) => {
    dispatch({ type: 'REMOVE_DRAFT', payload: ruleId })
  }, [])

  const discardAllDrafts = useCallback(() => {
    dispatch({ type: 'CLEAR_DRAFTS' })
  }, [])

  const publishDrafts = useCallback(() => {
    dispatch({ type: 'PUBLISH_DRAFTS' })
  }, [])

  const setShowDeleted = useCallback((show: boolean) => {
    dispatch({ type: 'SET_SHOW_DELETED', payload: show })
  }, [])

  const setSearchTerm = useCallback((term: string) => {
    dispatch({ type: 'SET_SEARCH_TERM', payload: term })
  }, [])

  const toggleExpandedRow = useCallback((ruleId: number) => {
    dispatch({ type: 'TOGGLE_EXPANDED_ROW', payload: ruleId })
  }, [])

  const collapseAllRows = useCallback(() => {
    dispatch({ type: 'COLLAPSE_ALL_ROWS' })
  }, [])

  const setEditingRule = useCallback((rule: PricingRule | null) => {
    dispatch({ type: 'SET_EDITING_RULE', payload: rule })
  }, [])

  const getRuleWithDraft = useCallback((ruleId: number): PricingRule => {
    const draft = state.drafts.find(d => d.ruleId === ruleId)
    if (draft) return draft.updatedRule
    return state.rules.find(r => r.RuleId === ruleId) || createBlankRule(ruleId)
  }, [state.drafts, state.rules])

  const getDraftForRule = useCallback((ruleId: number): DraftEntry | undefined => {
    return state.drafts.find(d => d.ruleId === ruleId)
  }, [state.drafts])

  const hasDraft = useCallback((ruleId: number): boolean => {
    return state.drafts.some(d => d.ruleId === ruleId)
  }, [state.drafts])

  const createNewRule = useCallback((): PricingRule => {
    const tempId = nextTempIdRef.current
    nextTempIdRef.current -= 1
    return createBlankRule(tempId)
  }, [])

  const getDisplayRules = useCallback((): PricingRule[] => {
    // Start with base rules
    let displayRules = state.rules.map(rule => {
      const draft = state.drafts.find(d => d.ruleId === rule.RuleId)
      return draft ? draft.updatedRule : rule
    })

    // Add created drafts (negative IDs)
    const createdDrafts = state.drafts.filter(d => d.type === 'create')
    displayRules = [...displayRules, ...createdDrafts.map(d => d.updatedRule)]

    // Filter by search term
    if (state.searchTerm) {
      const term = state.searchTerm.toLowerCase()
      displayRules = displayRules.filter(rule => 
        rule.RuleDescription.toLowerCase().includes(term) ||
        rule.Lenders.some(l => l.toLowerCase().includes(term)) ||
        rule.RuleId.toString().includes(term)
      )
    }

    // Filter deleted unless show deleted is on
    if (!state.showDeleted) {
      displayRules = displayRules.filter(rule => !rule.RuleIsDeleted)
    }

    // Sort: drafts first, then by description
    displayRules.sort((a, b) => {
      const aDraft = state.drafts.some(d => d.ruleId === a.RuleId)
      const bDraft = state.drafts.some(d => d.ruleId === b.RuleId)
      
      if (aDraft && !bDraft) return -1
      if (!aDraft && bDraft) return 1
      
      return a.RuleDescription.localeCompare(b.RuleDescription)
    })

    return displayRules
  }, [state.rules, state.drafts, state.searchTerm, state.showDeleted])

  const getDraftCounts = useCallback(() => {
    return {
      created: state.drafts.filter(d => d.type === 'create').length,
      updated: state.drafts.filter(d => d.type === 'update' || d.type === 'toggleActive').length,
      deleted: state.drafts.filter(d => d.type === 'delete').length,
      restored: state.drafts.filter(d => d.type === 'restore').length,
    }
  }, [state.drafts])

  const value = useMemo(() => ({
    state,
    stageUpdate,
    stageCreate,
    stageDelete,
    stageRestore,
    stageToggleActive,
    discardDraft,
    discardAllDrafts,
    publishDrafts,
    setShowDeleted,
    setSearchTerm,
    toggleExpandedRow,
    collapseAllRows,
    setEditingRule,
    getRuleWithDraft,
    getDraftForRule,
    hasDraft,
    createNewRule,
    getDisplayRules,
    getDraftCounts,
  }), [
    state,
    stageUpdate,
    stageCreate,
    stageDelete,
    stageRestore,
    stageToggleActive,
    discardDraft,
    discardAllDrafts,
    publishDrafts,
    setShowDeleted,
    setSearchTerm,
    toggleExpandedRow,
    collapseAllRows,
    setEditingRule,
    getRuleWithDraft,
    getDraftForRule,
    hasDraft,
    createNewRule,
    getDisplayRules,
    getDraftCounts,
  ])

  return (
    <PricingRulesContext.Provider value={value}>
      {children}
    </PricingRulesContext.Provider>
  )
}

export function usePricingRules() {
  const context = useContext(PricingRulesContext)
  if (!context) {
    throw new Error('usePricingRules must be used within a PricingRulesProvider')
  }
  return context
}
