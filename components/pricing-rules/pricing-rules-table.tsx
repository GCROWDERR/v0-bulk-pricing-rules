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
  Pencil,
  Copy,
  Trash2,
  Undo2,
} from 'lucide-react'
import { usePricingRules } from '@/lib/pricing-rules-context'
import type { PricingRule } from '@/lib/pricing-rules-data'
import { formatCurrency, formatPrice, formatPercent } from '@/lib/pricing-rules-data'
import { InlineQuickEdit } from './inline-quick-edit'
import { cn } from '@/lib/utils'

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
    if (lenders.length <= 5) return lenders.join(', ')
    
    const visible = lenders.slice(0, 5).join(', ')
    return (
      <span>
        {visible}
        <Tooltip>
          <TooltipTrigger asChild>
            <button className="ml-1 text-blue-600 hover:underline text-xs">
              +{lenders.length - 5} more
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <p className="text-xs">{lenders.slice(5).join(', ')}</p>
          </TooltipContent>
        </Tooltip>
      </span>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Table Container */}
      <div className="flex-1 overflow-auto border rounded-lg">
        <Table>
          <TableHeader className="sticky top-0 z-10">
            <TableRow className="bg-gray-200 hover:bg-gray-200">
              {/* Expand column */}
              <TableHead className="w-10 bg-gray-200" />
              
              {visibleColumns.has('RuleId') && (
                <TableHead className="w-[90px] bg-gray-200 text-gray-700 font-semibold">
                  Rule ID
                </TableHead>
              )}
              {visibleColumns.has('RuleDescription') && (
                <TableHead className="w-[260px] bg-gray-200 text-gray-700 font-semibold">
                  Rule Description
                </TableHead>
              )}
              {visibleColumns.has('Lenders') && (
                <TableHead className="w-[240px] bg-gray-200 text-gray-700 font-semibold">
                  Included Lenders
                </TableHead>
              )}
              {visibleColumns.has('Fee') && (
                <TableHead className="w-[90px] bg-gray-200 text-gray-700 font-semibold">
                  Fee
                </TableHead>
              )}
              {visibleColumns.has('Price') && (
                <TableHead className="w-[90px] bg-gray-200 text-gray-700 font-semibold">
                  Price
                </TableHead>
              )}
              {visibleColumns.has('CompPercent') && (
                <TableHead className="w-[90px] bg-gray-200 text-gray-700 font-semibold">
                  Margin %
                </TableHead>
              )}
              {visibleColumns.has('Active') && (
                <TableHead className="w-[120px] bg-gray-200 text-gray-700 font-semibold">
                  Active
                </TableHead>
              )}
              {visibleColumns.has('Disallow') && (
                <TableHead className="w-[90px] bg-gray-200 text-gray-700 font-semibold">
                  Disallow
                </TableHead>
              )}
              {state.showDeleted && visibleColumns.has('RuleIsDeleted') && (
                <TableHead className="w-[90px] bg-gray-200 text-gray-700 font-semibold">
                  Deleted
                </TableHead>
              )}
              <TableHead className="w-[175px] bg-gray-200 text-gray-700 font-semibold">
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
                    {/* Expand toggle */}
                    <TableCell className="w-10 p-0">
                      <button
                        onClick={(e) => handleExpandClick(rule.RuleId, e)}
                        className="p-2 hover:bg-gray-100 rounded-md transition-colors"
                        data-no-navigate
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-gray-500" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-gray-500" />
                        )}
                      </button>
                    </TableCell>

                    {visibleColumns.has('RuleId') && (
                      <TableCell className={cn('font-mono text-sm', isDeleted && 'line-through text-muted-foreground')}>
                        {rule.RuleId < 0 ? '—' : rule.RuleId}
                        {isDraft && (
                          <Badge variant="outline" className="ml-2 text-xs bg-green-100 text-green-700 border-green-300">
                            Draft
                          </Badge>
                        )}
                      </TableCell>
                    )}

                    {visibleColumns.has('RuleDescription') && (
                      <TableCell className={cn('font-medium', isDeleted && 'line-through text-muted-foreground')}>
                        {displayRule.RuleDescription || '(No description)'}
                      </TableCell>
                    )}

                    {visibleColumns.has('Lenders') && (
                      <TableCell className={cn('text-sm', isDeleted && 'line-through text-muted-foreground')}>
                        {renderLenders(displayRule.Lenders)}
                      </TableCell>
                    )}

                    {visibleColumns.has('Fee') && (
                      <TableCell className={cn('font-mono text-sm', isDeleted && 'line-through text-muted-foreground')}>
                        {formatCurrency(displayRule.Fee)}
                      </TableCell>
                    )}

                    {visibleColumns.has('Price') && (
                      <TableCell className={cn('font-mono text-sm', isDeleted && 'line-through text-muted-foreground')}>
                        {formatPrice(displayRule.Price)}
                      </TableCell>
                    )}

                    {visibleColumns.has('CompPercent') && (
                      <TableCell className={cn('font-mono text-sm', isDeleted && 'line-through text-muted-foreground')}>
                        {formatPercent(displayRule.CompPercent)}
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

                    <TableCell>
                      <div className="flex items-center gap-1">
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
                                className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
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

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 border-t bg-white">
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
