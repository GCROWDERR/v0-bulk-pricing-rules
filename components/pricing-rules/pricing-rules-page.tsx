'use client'

import { useState } from 'react'
import { PricingRulesProvider, usePricingRules } from '@/lib/pricing-rules-context'
import { PricingRulesToolbar } from './pricing-rules-toolbar'
import { PricingRulesTable } from './pricing-rules-table'
import { EditRuleDialog } from './edit-rule-dialog'
import { RuleBuilderDialog } from './rule-builder-dialog'
import { PublishDialog } from './publish-dialog'
import { createBlankRule } from '@/lib/pricing-rules-data'
import { cn } from '@/lib/utils'

const DEFAULT_VISIBLE_COLUMNS = new Set([
  'RuleId',
  'RuleDescription',
  'Lenders',
  'Fee',
  'Price',
  'CompPercent',
  'Active',
  'Disallow',
  'RuleIsDeleted',
])

function PricingRulesContent() {
  const { state, setEditingRule, stageCreate } = usePricingRules()
  
  // UI state
  const [density, setDensity] = useState<'comfortable' | 'compact' | 'spacious'>('comfortable')
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(DEFAULT_VISIBLE_COLUMNS)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showRuleBuilder, setShowRuleBuilder] = useState(false)
  const [showPublishDialog, setShowPublishDialog] = useState(false)
  const [isNewRule, setIsNewRule] = useState(false)

  const handleNewRule = () => {
    const newRule = createBlankRule(-Date.now())
    stageCreate(newRule)
    setIsNewRule(true)
    setEditingRule(newRule)
  }

  const handleEditDialogClose = () => {
    setEditingRule(null)
    setIsNewRule(false)
  }

  return (
    <div className={cn(
      'flex flex-col bg-white',
      isFullscreen ? 'fixed inset-0 z-50' : 'h-screen'
    )}>
      {/* Header */}
      <div className="px-6 py-4 border-b">
        <h1 className="text-2xl font-semibold text-gray-900">Pricing Rules</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage client pricing rules and adjustments.
        </p>
      </div>

      {/* Toolbar */}
      <PricingRulesToolbar
        density={density}
        setDensity={setDensity}
        visibleColumns={visibleColumns}
        setVisibleColumns={setVisibleColumns}
        isFullscreen={isFullscreen}
        setIsFullscreen={setIsFullscreen}
        onNewRule={handleNewRule}
        onOpenRuleBuilder={() => setShowRuleBuilder(true)}
        onOpenPublishDialog={() => setShowPublishDialog(true)}
      />

      {/* Table */}
      <div className="flex-1 overflow-hidden px-4 py-4">
        <PricingRulesTable
          density={density}
          visibleColumns={visibleColumns}
        />
      </div>

      {/* Edit Rule Dialog */}
      <EditRuleDialog
        rule={state.editingRule}
        open={state.editingRule !== null}
        onOpenChange={(open) => {
          if (!open) handleEditDialogClose()
        }}
        isNew={isNewRule}
      />

      {/* Rule Builder Dialog */}
      <RuleBuilderDialog
        open={showRuleBuilder}
        onOpenChange={setShowRuleBuilder}
      />

      {/* Publish Dialog */}
      <PublishDialog
        open={showPublishDialog}
        onOpenChange={setShowPublishDialog}
      />
    </div>
  )
}

export function PricingRulesPage() {
  return (
    <PricingRulesProvider>
      <PricingRulesContent />
    </PricingRulesProvider>
  )
}
