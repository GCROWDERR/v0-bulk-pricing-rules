'use client'

import { useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { ChevronDown, ChevronRight, Plus, Pencil, Trash2, RotateCcw, Power } from 'lucide-react'
import { useState } from 'react'
import { usePricingRules } from '@/lib/pricing-rules-context'
import { formatCurrency, formatPrice, formatPercent, formatLoanAmount } from '@/lib/pricing-rules-data'
import type { PricingRule, DraftEntry } from '@/lib/pricing-rules-data'
import { cn } from '@/lib/utils'

interface PublishDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function formatFieldValue(field: string, value: unknown): string {
  if (value === null || value === undefined) return '—'
  
  if (Array.isArray(value)) {
    if (value.length === 0) return '(none)'
    if (value.length <= 3) return value.join(', ')
    return `${value.slice(0, 3).join(', ')} +${value.length - 3} more`
  }
  
  switch (field) {
    case 'Fee':
    case 'CompMin':
    case 'CompMax':
    case 'CompFlatFee':
    case 'MaxCashBack':
      return formatCurrency(value as number)
    case 'Price':
    case 'FinalPriceMin':
    case 'FinalPriceMax':
      return formatPrice(value as number)
    case 'CompPercent':
    case 'LTVMin':
    case 'LTVMax':
      return formatPercent(value as number)
    case 'LoanAmountMin':
    case 'LoanAmountMax':
      return formatLoanAmount(value as number)
    case 'Active':
    case 'Disallow':
    case 'RuleIsDeleted':
    case 'HasSecondMortgage':
    case 'IgnoreNonEighthRates':
    case 'IncludeUFMIP':
    case 'FinanceUFMIP':
    case 'HideInQuoteAdjustments':
      return value ? 'Yes' : 'No'
    case 'LockPeriod':
      return `${value} Days`
    default:
      return String(value)
  }
}

function getFieldLabel(field: string): string {
  const labels: Record<string, string> = {
    RuleId: 'Rule ID',
    RuleDescription: 'Description',
    Lenders: 'Lenders',
    Fee: 'Fee',
    Price: 'Price',
    CompPercent: 'Margin %',
    Active: 'Active',
    Disallow: 'Disallow',
    RuleIsDeleted: 'Deleted',
    LockPeriod: 'Lock Period',
    FeeSet: 'Fee Set',
    MICompany: 'MI Company',
    Rate: 'Rate',
    MarginType: 'Margin Type',
    CompMin: 'Comp Min',
    CompMax: 'Comp Max',
    CompFlatFee: 'Comp Flat Fee',
    FinalPriceMin: 'Final Price Min',
    FinalPriceMax: 'Final Price Max',
    HasSecondMortgage: 'Has Second Mortgage',
    IgnoreNonEighthRates: 'Ignore Non Eighth Rates',
    IncludeUFMIP: 'Include UFMIP',
    MaxCashBack: 'Max Cash Back',
    FinanceUFMIP: 'Finance UFMIP',
    LTVMin: 'LTV Min',
    LTVMax: 'LTV Max',
    FICOMin: 'FICO Min',
    FICOMax: 'FICO Max',
    LoanAmountMin: 'Loan Amount Min',
    LoanAmountMax: 'Loan Amount Max',
    PropertyTypes: 'Property Types',
    PropertyUsage: 'Property Usage',
    LoanTypes: 'Loan Types',
    QuotingChannels: 'Quoting Channels',
    LockPeriods: 'Lock Periods',
    BorrowerFilters: 'Borrower Filters',
    PointGroups: 'Point Groups',
    States: 'States',
    ProductFamilies: 'Product Families',
    ProductClasses: 'Product Classes',
    ProductTypes: 'Product Types',
    ProductTerms: 'Product Terms',
    StartDate: 'Start Date',
    EndDate: 'End Date',
    StartTime: 'Start Time',
    EndTime: 'End Time',
    HideInQuoteAdjustments: 'Hide in Quote Adjustments',
  }
  return labels[field] || field
}

interface DraftItemProps {
  draft: DraftEntry
}

function DraftItem({ draft }: DraftItemProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  const icon = useMemo(() => {
    switch (draft.type) {
      case 'create':
        return <Plus className="h-4 w-4 text-green-600" />
      case 'update':
        return <Pencil className="h-4 w-4 text-blue-600" />
      case 'delete':
        return <Trash2 className="h-4 w-4 text-red-600" />
      case 'restore':
        return <RotateCcw className="h-4 w-4 text-green-600" />
      case 'toggleActive':
        return <Power className="h-4 w-4 text-amber-600" />
    }
  }, [draft.type])

  const typeLabel = useMemo(() => {
    switch (draft.type) {
      case 'create':
        return 'New Rule'
      case 'update':
        return 'Updated'
      case 'delete':
        return 'Deleted'
      case 'restore':
        return 'Restored'
      case 'toggleActive':
        return draft.updatedRule.Active ? 'Activated' : 'Deactivated'
    }
  }, [draft.type, draft.updatedRule.Active])

  const typeBadgeClass = useMemo(() => {
    switch (draft.type) {
      case 'create':
        return 'bg-green-100 text-green-700 border-green-300'
      case 'update':
        return 'bg-blue-100 text-blue-700 border-blue-300'
      case 'delete':
        return 'bg-red-100 text-red-700 border-red-300'
      case 'restore':
        return 'bg-green-100 text-green-700 border-green-300'
      case 'toggleActive':
        return 'bg-amber-100 text-amber-700 border-amber-300'
    }
  }, [draft.type])

  // Get field changes for update drafts
  const fieldChanges = useMemo(() => {
    if (draft.type !== 'update' && draft.type !== 'toggleActive') return []
    if (!draft.originalRule || !draft.changedFields) return []

    return draft.changedFields.map(field => ({
      field,
      oldValue: draft.originalRule![field as keyof PricingRule],
      newValue: draft.updatedRule[field as keyof PricingRule],
    }))
  }, [draft])

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <div className="border rounded-lg overflow-hidden">
        <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-gray-200 text-left">
          <div className="flex items-center gap-3">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-500" />
            )}
            {icon}
            <div>
              <p className="font-medium text-sm truncate max-w-[350px]">
                {draft.updatedRule.RuleDescription || '(No description)'}
              </p>
              <p className="text-xs text-gray-400">
                {draft.ruleId > 0 ? `Rule ID: ${draft.ruleId}` : 'New Rule'}
              </p>
            </div>
          </div>
          <Badge variant="outline" className={cn('text-xs', typeBadgeClass)}>
            {typeLabel}
          </Badge>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 pt-2 border-t bg-gray-50">
            {draft.type === 'create' ? (
              <div className="space-y-2">
                <p className="text-xs text-gray-500 mb-2">New rule will be created with:</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Description:</span>
                    <span className="font-medium">{draft.updatedRule.RuleDescription || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Price:</span>
                    <span className="font-medium">{formatPrice(draft.updatedRule.Price)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Fee:</span>
                    <span className="font-medium">{formatCurrency(draft.updatedRule.Fee)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Margin %:</span>
                    <span className="font-medium">{formatPercent(draft.updatedRule.CompPercent)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">FICO Range:</span>
                    <span className="font-medium">{draft.updatedRule.FICOMin} - {draft.updatedRule.FICOMax}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Lenders:</span>
                    <span className="font-medium">{draft.updatedRule.Lenders.length} selected</span>
                  </div>
                </div>
              </div>
            ) : draft.type === 'delete' ? (
              <p className="text-sm text-coral-500">
                This rule will be marked as deleted (soft delete).
              </p>
            ) : draft.type === 'restore' ? (
              <p className="text-sm text-teal-500">
                This rule will be restored (un-deleted).
              </p>
            ) : fieldChanges.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs text-gray-500 mb-2">
                  {fieldChanges.length} field{fieldChanges.length !== 1 ? 's' : ''} changed:
                </p>
                <div className="space-y-1">
                  {fieldChanges.map(({ field, oldValue, newValue }) => (
                    <div
                      key={field}
                      className="flex items-center gap-2 text-sm bg-white p-2 rounded border"
                    >
                      <span className="text-gray-600 font-medium min-w-[120px]">
                        {getFieldLabel(field)}:
                      </span>
                      <span className="text-red-600 line-through">
                        {formatFieldValue(field, oldValue)}
                      </span>
                      <span className="text-gray-400">→</span>
                      <span className="text-green-600 font-medium">
                        {formatFieldValue(field, newValue)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No detailed changes available.</p>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

export function PublishDialog({ open, onOpenChange }: PublishDialogProps) {
  const { state, publishDrafts, getDraftCounts } = usePricingRules()
  const draftCounts = getDraftCounts()

  const handlePublish = () => {
    publishDrafts()
    onOpenChange(false)
  }

  // Group drafts by type
  const groupedDrafts = useMemo(() => {
    return {
      created: state.drafts.filter(d => d.type === 'create'),
      updated: state.drafts.filter(d => d.type === 'update' || d.type === 'toggleActive'),
      deleted: state.drafts.filter(d => d.type === 'delete'),
      restored: state.drafts.filter(d => d.type === 'restore'),
    }
  }, [state.drafts])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0 gap-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle>Publish Changes</DialogTitle>
          <DialogDescription>
            Review the changes that will be published
          </DialogDescription>
        </DialogHeader>

        {/* Summary badges */}
        <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b">
          {draftCounts.created > 0 && (
            <Badge className="bg-green-100 text-green-700 border-green-300">
              {draftCounts.created} new
            </Badge>
          )}
          {draftCounts.updated > 0 && (
            <Badge className="bg-blue-100 text-blue-700 border-blue-300">
              {draftCounts.updated} updated
            </Badge>
          )}
          {draftCounts.deleted > 0 && (
            <Badge className="bg-red-100 text-red-700 border-red-300">
              {draftCounts.deleted} deleted
            </Badge>
          )}
          {draftCounts.restored > 0 && (
            <Badge className="bg-green-100 text-green-700 border-green-300">
              {draftCounts.restored} restored
            </Badge>
          )}
        </div>

        <ScrollArea className="flex-1 max-h-[calc(85vh-200px)]">
          <div className="p-4 space-y-4">
            {/* Created rules */}
            {groupedDrafts.created.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-teal-600 flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  New Rules ({groupedDrafts.created.length})
                </h3>
                <div className="space-y-2">
                  {groupedDrafts.created.map((draft) => (
                    <DraftItem key={draft.ruleId} draft={draft} />
                  ))}
                </div>
              </div>
            )}

            {/* Updated rules */}
            {groupedDrafts.updated.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-blue-600 flex items-center gap-2">
                  <Pencil className="h-4 w-4" />
                  Updated Rules ({groupedDrafts.updated.length})
                </h3>
                <div className="space-y-2">
                  {groupedDrafts.updated.map((draft) => (
                    <DraftItem key={draft.ruleId} draft={draft} />
                  ))}
                </div>
              </div>
            )}

            {/* Deleted rules */}
            {groupedDrafts.deleted.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-coral-500 flex items-center gap-2">
                  <Trash2 className="h-4 w-4" />
                  Deleted Rules ({groupedDrafts.deleted.length})
                </h3>
                <div className="space-y-2">
                  {groupedDrafts.deleted.map((draft) => (
                    <DraftItem key={draft.ruleId} draft={draft} />
                  ))}
                </div>
              </div>
            )}

            {/* Restored rules */}
            {groupedDrafts.restored.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-teal-600 flex items-center gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Restored Rules ({groupedDrafts.restored.length})
                </h3>
                <div className="space-y-2">
                  {groupedDrafts.restored.map((draft) => (
                    <DraftItem key={draft.ruleId} draft={draft} />
                  ))}
                </div>
              </div>
            )}

            {state.drafts.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No changes to publish.
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="p-4 border-t border-gray-200 bg-gray-50">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-gray-300">
            Cancel
          </Button>
          <Button
            onClick={handlePublish}
            className="bg-teal-500 hover:bg-teal-600 text-white font-medium"
            disabled={state.drafts.length === 0}
          >
            Publish {state.drafts.length} Change{state.drafts.length !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
