'use client'

import { useState, useMemo, Fragment } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  ChevronUp,
  Pencil,
  Copy,
  Trash2,
  Undo2,
  ArrowUpDown,
} from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { usePricingRules } from '@/lib/pricing-rules-context'
import type { SortField } from '@/lib/pricing-rules-context'
import type { PricingRule } from '@/lib/pricing-rules-data'
import { formatCurrency, formatPrice, formatPercent } from '@/lib/pricing-rules-data'
import { InlineQuickEdit } from './inline-quick-edit'
import { cn } from '@/lib/utils'

interface SortableHeaderProps {
  field: SortField
  label: string
  sortField: SortField | null
  sortDirection: 'asc' | 'desc'
  onSort: (field: SortField) => void
  className?: string
}

function SortableHeader({ field, label, sortField, sortDirection, onSort, className }: SortableHeaderProps) {
  const isActive = sortField === field
  
  return (
    <button
      onClick={() => onSort(field)}
      className={cn(
        'flex items-center gap-1 hover:text-blue-600 transition-colors w-full text-left',
        isActive && 'text-blue-600 font-semibold',
        className
      )}
    >
      <span>{label}</span>
      {isActive ? (
        sortDirection === 'asc' ? (
          <ChevronUp className="h-4 w-4 text-blue-600" />
        ) : (
          <ChevronDown className="h-4 w-4 text-blue-600" />
        )
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-40" />
      )}
    </button>
  )
}

interface PricingRulesTableProps {
  density: 'comfortable' | 'compact' | 'spacious'
  visibleColumns: Set<string>
}

const PAGE_SIZE_OPTIONS = [5, 10, 15, 20, 25, 50, 'All'] as const

export function PricingRulesTable({ density, visibleColumns }: PricingRulesTableProps) {
  const {
    state,
    getDisplayRules,
    hasDraft,
    getDraftForRule,
    stageToggleActive,
    stageDelete,
    stageRestore,
    discardDraft,
    toggleExpandedRow,
    setEditingRule,
    stageCreate,
    getRuleWithDraft,
    toggleSelectedRow,
    selectRows,
    clearSelection,
    toggleSort,
    setRuleSetFilter,
  } = usePricingRules()

  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState<number | 'All'>(50)

  const displayRules = getDisplayRules()
  
  const totalPages = pageSize === 'All' ? 1 : Math.ceil(displayRules.length / pageSize)
  const paginatedRules = useMemo(() => {
    if (pageSize === 'All') return displayRules
    const start = (currentPage - 1) * pageSize
    return displayRules.slice(start, start + pageSize)
  }, [displayRules, currentPage, pageSize])

  const densityClasses = {
    comfortable: 'h-12',
    compact: 'h-8',
    spacious: 'h-16',
  }

  const handleRowClick = (rule: PricingRule, e: React.MouseEvent) => {
    // Don't navigate if clicking on interactive elements
    if ((e.target as HTMLElement).closest('button, [role="switch"], [data-no-navigate]')) {
      return
    }
    setEditingRule(rule)
  }

  const handleCopyRule = (rule: PricingRule, e: React.MouseEvent) => {
    e.stopPropagation()
    const newRule: PricingRule = {
      ...rule,
      RuleId: -Date.now(), // Temporary negative ID
      RuleDescription: `${rule.RuleDescription} (Copy)`,
      RuleIsDeleted: false,
    }
    stageCreate(newRule)
  }

  const handleDeleteRule = (rule: PricingRule, e: React.MouseEvent) => {
    e.stopPropagation()
    stageDelete(rule)
  }

  const handleRestoreRule = (rule: PricingRule, e: React.MouseEvent) => {
    e.stopPropagation()
    stageRestore(rule)
  }

  const handleDiscardDraft = (ruleId: number, e: React.MouseEvent) => {
    e.stopPropagation()
    discardDraft(ruleId)
  }

  const handleToggleActive = (rule: PricingRule, e: React.MouseEvent) => {
    e.stopPropagation()
    const currentRule = getRuleWithDraft(rule.RuleId)
    stageToggleActive(currentRule)
  }

  const handleExpandClick = (ruleId: number, e: React.MouseEvent) => {
    e.stopPropagation()
    toggleExpandedRow(ruleId)
  }

  const handleSelectRow = (ruleId: number, e: React.MouseEvent) => {
    e.stopPropagation()
    toggleSelectedRow(ruleId)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      selectRows(paginatedRules.map(r => r.RuleId))
    } else {
      clearSelection()
    }
  }

  const isAllSelected = paginatedRules.length > 0 && paginatedRules.every(r => state.selectedRows.has(r.RuleId))
  const isSomeSelected = paginatedRules.some(r => state.selectedRows.has(r.RuleId))

  const getRowBackground = (rule: PricingRule) => {
    const draft = getDraftForRule(rule.RuleId)
    
    if (draft) {
      if (draft.type === 'delete') return 'bg-red-50'
      return 'bg-green-50/50'
    }
    
    if (rule.RuleIsDeleted) return 'bg-red-50/50'
    if (!rule.Active) return 'bg-amber-50/50'
    
    return ''
  }

  const renderLenders = (lenders: string[]) => {
    if (lenders.length === 0) return '—'
    
    // Show truncated text with hover-to-expand for ALL lender lists
    const displayText = lenders.length <= 2 
      ? lenders.join(', ') 
      : `${lenders.slice(0, 2).join(', ')}...`
    
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-help hover:text-blue-600 transition-colors truncate block">
            {displayText}
            {lenders.length > 2 && (
              <span className="ml-1 text-blue-600 text-xs font-medium">
                +{lenders.length - 2}
              </span>
            )}
          </span>
        </TooltipTrigger>
        <TooltipContent 
          side="bottom" 
          align="start"
          className="max-w-sm p-3 bg-white border border-gray-200 shadow-lg"
        >
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-gray-700 border-b border-gray-100 pb-1">
              Included Lenders ({lenders.length})
            </p>
            <ul className="text-xs text-gray-600 space-y-0.5 max-h-48 overflow-y-auto">
              {lenders.map((lender, idx) => (
                <li key={idx} className="truncate">{lender}</li>
              ))}
            </ul>
          </div>
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Table Container - desktop/tablet */}
      <div className="hidden md:block flex-1 overflow-auto border border-gray-300 rounded-lg bg-white">
        <Table className="w-full table-fixed">
          <TableHeader className="sticky top-0 z-10">
            <TableRow className="bg-blue-50 hover:bg-blue-50 border-b border-gray-300">
              {/* Select all checkbox */}
              <TableHead className="w-10 min-w-10 bg-blue-50">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all"
                  className={isSomeSelected && !isAllSelected ? 'opacity-50' : ''}
                />
              </TableHead>
              
              {visibleColumns.has('RuleId') && (
                <TableHead className="w-[8%] min-w-[70px] bg-blue-50 text-gray-900 font-medium">
                  <SortableHeader
                    field="RuleId"
                    label="Rule ID"
                    sortField={state.sortField}
                    sortDirection={state.sortDirection}
                    onSort={toggleSort}
                  />
                </TableHead>
              )}
              {visibleColumns.has('RuleSetId') && (
                <TableHead className="w-[12%] min-w-[100px] bg-blue-50 text-gray-900 font-medium">
                  <SortableHeader
                    field="RuleSetId"
                    label="Rule Set"
                    sortField={state.sortField}
                    sortDirection={state.sortDirection}
                    onSort={toggleSort}
                  />
                </TableHead>
              )}
              {visibleColumns.has('RuleDescription') && (
                <TableHead className="w-[22%] min-w-[150px] bg-blue-50 text-gray-900 font-medium">
                  <SortableHeader
                    field="RuleDescription"
                    label="Rule Description"
                    sortField={state.sortField}
                    sortDirection={state.sortDirection}
                    onSort={toggleSort}
                  />
                </TableHead>
              )}
              {visibleColumns.has('Lenders') && (
                <TableHead className="w-[18%] min-w-[120px] bg-blue-50 text-gray-900 font-medium">
                  <SortableHeader
                    field="Lenders"
                    label="Included Lenders"
                    sortField={state.sortField}
                    sortDirection={state.sortDirection}
                    onSort={toggleSort}
                  />
                </TableHead>
              )}
              {visibleColumns.has('CompPercent') && (
                <TableHead className="w-[8%] min-w-[70px] bg-blue-50 text-gray-900 font-medium">
                  <SortableHeader
                    field="CompPercent"
                    label="Margin"
                    sortField={state.sortField}
                    sortDirection={state.sortDirection}
                    onSort={toggleSort}
                  />
                </TableHead>
              )}
              {visibleColumns.has('Fee') && (
                <TableHead className="w-[7%] min-w-[60px] bg-blue-50 text-gray-900 font-medium">
                  <SortableHeader
                    field="Fee"
                    label="Fee"
                    sortField={state.sortField}
                    sortDirection={state.sortDirection}
                    onSort={toggleSort}
                  />
                </TableHead>
              )}
              {visibleColumns.has('Price') && (
                <TableHead className="w-[7%] min-w-[60px] bg-blue-50 text-gray-900 font-medium">
                  <SortableHeader
                    field="Price"
                    label="Price"
                    sortField={state.sortField}
                    sortDirection={state.sortDirection}
                    onSort={toggleSort}
                  />
                </TableHead>
              )}
              {visibleColumns.has('Active') && (
                <TableHead className="w-[7%] min-w-[60px] bg-blue-50 text-gray-900 font-medium">
                  <SortableHeader
                    field="Active"
                    label="Active"
                    sortField={state.sortField}
                    sortDirection={state.sortDirection}
                    onSort={toggleSort}
                  />
                </TableHead>
              )}
              {visibleColumns.has('Disallow') && (
                <TableHead className="w-[7%] min-w-[60px] bg-blue-50 text-gray-900 font-medium">
                  <SortableHeader
                    field="Disallow"
                    label="Disallow"
                    sortField={state.sortField}
                    sortDirection={state.sortDirection}
                    onSort={toggleSort}
                  />
                </TableHead>
              )}
              {state.showDeleted && visibleColumns.has('RuleIsDeleted') && (
                <TableHead className="w-[7%] min-w-[60px] bg-blue-50 text-gray-900 font-medium">
                  <SortableHeader
                    field="RuleIsDeleted"
                    label="Deleted"
                    sortField={state.sortField}
                    sortDirection={state.sortDirection}
                    onSort={toggleSort}
                  />
                </TableHead>
              )}
              <TableHead className="w-[12%] min-w-[120px] bg-blue-50 text-gray-900 font-medium">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedRules.map((rule, index) => {
              const isExpanded = state.expandedRows.has(rule.RuleId)
              const isDraft = hasDraft(rule.RuleId)
              const draft = getDraftForRule(rule.RuleId)
              const displayRule = isDraft ? getRuleWithDraft(rule.RuleId) : rule
              const rowBg = getRowBackground(displayRule)
              const isDeleted = displayRule.RuleIsDeleted
              const isEven = index % 2 === 0

              return (
                <Fragment key={rule.RuleId}>
                  <TableRow
                    className={cn(
                      densityClasses[density],
                      'cursor-pointer transition-colors',
                      rowBg || (isEven ? 'bg-white' : 'bg-gray-50/50'),
                      isDeleted && 'opacity-60'
                    )}
                    onClick={(e) => handleRowClick(displayRule, e)}
                  >
                    {/* Row selection checkbox */}
                    <TableCell className="w-10 min-w-10" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={state.selectedRows.has(rule.RuleId)}
                        onCheckedChange={() => toggleSelectedRow(rule.RuleId)}
                        aria-label={`Select rule ${rule.RuleId}`}
                        data-no-navigate
                      />
                    </TableCell>

                    {visibleColumns.has('RuleId') && (
                      <TableCell className={cn('font-sans text-sm truncate', isDeleted && 'line-through text-muted-foreground')}>
                        <span className="flex items-center gap-1">
                          {rule.RuleId < 0 ? '—' : rule.RuleId}
                          {isDraft && (
                            <Badge variant="outline" className="text-xs bg-green-100 text-green-700 border-green-300 shrink-0">
                              Draft
                            </Badge>
                          )}
                        </span>
                      </TableCell>
                    )}

                    {visibleColumns.has('RuleSetId') && (
                      <TableCell className="text-sm">
                        {displayRule.RuleSetId ? (() => {
                          const fullName = displayRule.RuleSetName || displayRule.RuleSetId
                          const isTruncated = fullName.length > 15
                          const displayName = isTruncated ? fullName.slice(0, 15) + '…' : fullName
                          const isFiltered = state.ruleSetFilter === displayRule.RuleSetId
                          return (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setRuleSetFilter(isFiltered ? null : displayRule.RuleSetId!)
                                  }}
                                  className={cn(
                                    'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border transition-colors max-w-[120px]',
                                    isFiltered
                                      ? 'bg-blue-600 text-white border-blue-600'
                                      : 'bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100'
                                  )}
                                >
                                  <span className="truncate">{displayName}</span>
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="bottom" className="max-w-[240px]">
                                {isTruncated && (
                                  <p className="font-medium mb-1">{fullName}</p>
                                )}
                                <p className="text-xs text-gray-300">
                                  {isFiltered ? 'Click to clear filter' : 'Click to filter by this rule set'}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          )
                        })() : (
                          <span className="text-gray-400">&mdash;</span>
                        )}
                      </TableCell>
                    )}

                    {visibleColumns.has('RuleDescription') && (
                      <TableCell className={cn('font-medium truncate', isDeleted && 'line-through text-muted-foreground')} title={displayRule.RuleDescription || '(No description)'}>
                        {displayRule.RuleDescription || '(No description)'}
                      </TableCell>
                    )}

                    {visibleColumns.has('Lenders') && (
                      <TableCell className={cn('text-sm truncate', isDeleted && 'line-through text-muted-foreground')}>
                        {renderLenders(displayRule.Lenders)}
                      </TableCell>
                    )}

                    {visibleColumns.has('CompPercent') && (
                      <TableCell className={cn('font-sans text-sm', isDeleted && 'line-through text-muted-foreground')}>
                        {formatPercent(displayRule.CompPercent)}
                      </TableCell>
                    )}

                    {visibleColumns.has('Fee') && (
                      <TableCell className={cn('font-sans text-sm', isDeleted && 'line-through text-muted-foreground')}>
                        {formatCurrency(displayRule.Fee)}
                      </TableCell>
                    )}

                    {visibleColumns.has('Price') && (
                      <TableCell className={cn('font-sans text-sm', isDeleted && 'line-through text-muted-foreground')}>
                        {formatPrice(displayRule.Price)}
                      </TableCell>
                    )}

                    {visibleColumns.has('Active') && (
                      <TableCell>
                        <Switch
                          checked={displayRule.Active}
                          onCheckedChange={() => {}}
                          onClick={(e) => handleToggleActive(displayRule, e)}
                          disabled={isDeleted}
                        />
                      </TableCell>
                    )}

                    {visibleColumns.has('Disallow') && (
                      <TableCell className={cn('text-sm', isDeleted && 'line-through text-muted-foreground')}>
                        {displayRule.Disallow ? 'Yes' : 'No'}
                      </TableCell>
                    )}

                    {state.showDeleted && visibleColumns.has('RuleIsDeleted') && (
                      <TableCell className="text-sm">
                        {displayRule.RuleIsDeleted ? 'Yes' : 'No'}
                      </TableCell>
                    )}

                    <TableCell className="overflow-visible">
                      <div className="flex items-center gap-0.5 flex-wrap">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation()
                                setEditingRule(displayRule)
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => handleCopyRule(displayRule, e)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Copy</TooltipContent>
                        </Tooltip>

                        {displayRule.RuleIsDeleted ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-gray-600 hover:text-gray-700 hover:bg-gray-200"
                                onClick={(e) => handleRestoreRule(displayRule, e)}
                              >
                                <Undo2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Restore</TooltipContent>
                          </Tooltip>
                        ) : (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={(e) => handleDeleteRule(displayRule, e)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete</TooltipContent>
                          </Tooltip>
                        )}

                        {isDraft && draft?.type !== 'create' && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                onClick={(e) => handleDiscardDraft(rule.RuleId, e)}
                              >
                                <Undo2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Discard draft</TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>

                  {/* Expanded inline edit panel */}
                  {isExpanded && (
                    <TableRow key={`${rule.RuleId}-expanded`} className="hover:bg-transparent">
                      <TableCell 
                        colSpan={12} 
                        className="p-0 border-b-0"
                      >
                        <InlineQuickEdit rule={displayRule} />
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              )
            })}
            
            {paginatedRules.length === 0 && (
              <TableRow>
                <TableCell colSpan={12} className="h-32 text-center text-muted-foreground">
                  No pricing rules found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Card list - mobile */}
      <div className="md:hidden flex-1 overflow-auto flex flex-col gap-2">
        {/* Mobile select-all bar */}
        <div className="shrink-0 flex items-center gap-2 px-1 py-1">
          <Checkbox
            checked={isAllSelected}
            onCheckedChange={handleSelectAll}
            aria-label="Select all"
            className={isSomeSelected && !isAllSelected ? 'opacity-50' : ''}
          />
          <span className="text-sm text-muted-foreground">
            {isAllSelected ? 'Deselect all' : 'Select all on page'}
          </span>
        </div>

        {paginatedRules.map((rule) => {
          const isExpanded = state.expandedRows.has(rule.RuleId)
          const isDraft = hasDraft(rule.RuleId)
          const draft = getDraftForRule(rule.RuleId)
          const displayRule = isDraft ? getRuleWithDraft(rule.RuleId) : rule
          const rowBg = getRowBackground(displayRule)
          const isDeleted = displayRule.RuleIsDeleted
          const isSelected = state.selectedRows.has(rule.RuleId)

          return (
            <div
              key={rule.RuleId}
              className={cn(
                'shrink-0 border border-gray-300 rounded-lg bg-white overflow-hidden transition-colors',
                rowBg,
                isSelected && 'ring-2 ring-blue-500 border-blue-500',
                isDeleted && 'opacity-70'
              )}
            >
              {/* Card body - tap to edit */}
              <div
                className="p-3 cursor-pointer"
                onClick={(e) => handleRowClick(displayRule, e)}
              >
                {/* Top row: select + description + active */}
                <div className="flex items-start gap-3">
                  <div onClick={(e) => e.stopPropagation()} className="pt-0.5">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSelectedRow(rule.RuleId)}
                      aria-label={`Select rule ${rule.RuleId}`}
                      data-no-navigate
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium text-muted-foreground">
                        {rule.RuleId < 0 ? 'New' : `#${rule.RuleId}`}
                      </span>
                      {isDraft && (
                        <Badge variant="outline" className="text-xs bg-green-100 text-green-700 border-green-300">
                          Draft
                        </Badge>
                      )}
                      {isDeleted && (
                        <Badge variant="outline" className="text-xs bg-red-100 text-red-700 border-red-300">
                          Deleted
                        </Badge>
                      )}
                    </div>
                    <p className={cn('font-medium text-gray-900 mt-0.5 break-words', isDeleted && 'line-through text-muted-foreground')}>
                      {displayRule.RuleDescription || '(No description)'}
                    </p>
                    {displayRule.RuleSetId && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          const isFiltered = state.ruleSetFilter === displayRule.RuleSetId
                          setRuleSetFilter(isFiltered ? null : displayRule.RuleSetId!)
                        }}
                        className={cn(
                          'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border transition-colors mt-1.5 max-w-full',
                          state.ruleSetFilter === displayRule.RuleSetId
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-blue-50 text-blue-700 border-blue-300'
                        )}
                        data-no-navigate
                      >
                        <span className="truncate">{displayRule.RuleSetName || displayRule.RuleSetId}</span>
                      </button>
                    )}
                  </div>
                  <div onClick={(e) => e.stopPropagation()} className="shrink-0 flex flex-col items-center gap-1">
                    <Switch
                      checked={displayRule.Active}
                      onCheckedChange={() => {}}
                      onClick={(e) => handleToggleActive(displayRule, e)}
                      disabled={isDeleted}
                    />
                    <span className="text-[10px] text-muted-foreground">
                      {displayRule.Active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-gray-100 text-sm">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Margin</p>
                    <p className="font-sans">{formatPercent(displayRule.CompPercent)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Fee</p>
                    <p className="font-sans">{formatCurrency(displayRule.Fee)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Price</p>
                    <p className="font-sans">{formatPrice(displayRule.Price)}</p>
                  </div>
                </div>

                {/* Lenders */}
                <div className="mt-2 text-sm">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Lenders</p>
                  <p className="text-gray-700 break-words">
                    {displayRule.Lenders.length === 0
                      ? '—'
                      : displayRule.Lenders.join(', ')}
                  </p>
                </div>
              </div>

              {/* Actions bar */}
              <div className="flex items-center gap-1 px-2 py-1.5 border-t border-gray-100 bg-gray-50/60">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 gap-1.5 text-gray-700"
                  onClick={(e) => {
                    e.stopPropagation()
                    setEditingRule(displayRule)
                  }}
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 gap-1.5 text-gray-700"
                  onClick={(e) => handleCopyRule(displayRule, e)}
                >
                  <Copy className="h-4 w-4" />
                  Copy
                </Button>
                <div className="ml-auto flex items-center gap-1">
                  {isDraft && draft?.type !== 'create' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                      onClick={(e) => handleDiscardDraft(rule.RuleId, e)}
                      aria-label="Discard draft"
                    >
                      <Undo2 className="h-4 w-4" />
                    </Button>
                  )}
                  {displayRule.RuleIsDeleted ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-gray-600 hover:text-gray-700 hover:bg-gray-200"
                      onClick={(e) => handleRestoreRule(displayRule, e)}
                      aria-label="Restore rule"
                    >
                      <Undo2 className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={(e) => handleDeleteRule(displayRule, e)}
                      aria-label="Delete rule"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Expanded inline edit */}
              {isExpanded && (
                <div className="border-t border-gray-200">
                  <InlineQuickEdit rule={displayRule} />
                </div>
              )}
            </div>
          )
        })}

        {paginatedRules.length === 0 && (
          <div className="h-32 flex items-center justify-center text-center text-muted-foreground border border-gray-300 rounded-lg bg-white">
            No pricing rules found.
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-t bg-white flex-wrap">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Rows per page:</span>
          <Select
            value={pageSize.toString()}
            onValueChange={(v) => {
              setPageSize(v === 'All' ? 'All' : parseInt(v))
              setCurrentPage(1)
            }}
          >
            <SelectTrigger className="w-20 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={size.toString()}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="ml-4">
            {pageSize === 'All' 
              ? `${displayRules.length} total`
              : `${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, displayRules.length)} of ${displayRules.length}`
            }
          </span>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1 || pageSize === 'All'}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1 || pageSize === 'All'}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="px-3 text-sm">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages || pageSize === 'All'}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages || pageSize === 'All'}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
