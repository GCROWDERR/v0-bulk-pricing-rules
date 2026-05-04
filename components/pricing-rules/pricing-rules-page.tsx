'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PricingRulesProvider, usePricingRules } from '@/lib/pricing-rules-context'
import { PricingRulesToolbar } from './pricing-rules-toolbar'
import { PricingRulesTable } from './pricing-rules-table'
import { EditRuleDialog } from './edit-rule-dialog'
import { RuleBuilderDialog } from './rule-builder-dialog'
import { PublishDialog } from './publish-dialog'
import { cn } from '@/lib/utils'

// RuleSetEditor is rendered as a variant of RuleBuilderDialog with a pre-loaded rule set

const DEFAULT_VISIBLE_COLUMNS = new Set([
  'RuleId',
  'RuleSetId',
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
  const router = useRouter()
  const { state, setEditingRule, stageCreate } = usePricingRules()
  
  // UI state
  const [density, setDensity] = useState<'comfortable' | 'compact' | 'spacious'>('comfortable')
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(DEFAULT_VISIBLE_COLUMNS)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showRuleBuilder, setShowRuleBuilder] = useState(false)
  const [showRuleSetEditor, setShowRuleSetEditor] = useState(false)
  const [editingRuleSetId, setEditingRuleSetIdLocal] = useState<string | null>(null)
  const [showPublishDialog, setShowPublishDialog] = useState(false)

  const handleOpenRuleSetEditor = (ruleSetId: string) => {
    setEditingRuleSetIdLocal(ruleSetId)
    setShowRuleSetEditor(true)
  }

  const handleNewRule = () => {
    router.push('/rules/new')
  }

  const handleEditDialogClose = () => {
    setEditingRule(null)
  }

  return (
    <div className={cn(
      'flex flex-col bg-background',
      isFullscreen ? 'fixed inset-0 z-50' : 'h-screen'
    )}>
      {/* Header with LoanTek branding */}
      <div className="px-6 py-4 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-4">
          <img 
            src="/loantek-logo.webp" 
            alt="LoanTek" 
            className="h-8"
          />
          <div className="h-8 w-px bg-gray-300" />
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Pricing Rules</h1>
            <p className="text-sm text-gray-600">
              Manage client pricing rules and adjustments
            </p>
          </div>
        </div>
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
        onOpenRuleSetEditor={handleOpenRuleSetEditor}
      />

      {/* Table */}
      <div className="flex-1 overflow-hidden px-4 py-4 bg-gray-50">
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
      />

      {/* Rule Builder Dialog - create new rule sets */}
      <RuleBuilderDialog
        open={showRuleBuilder}
        onOpenChange={setShowRuleBuilder}
      />

      {/* Rule Set Editor Dialog - edit existing rule sets */}
      <RuleBuilderDialog
        open={showRuleSetEditor}
        onOpenChange={(open) => {
          setShowRuleSetEditor(open)
          if (!open) setEditingRuleSetIdLocal(null)
        }}
        editingRuleSetId={editingRuleSetId}
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
