'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import {
  Download,
  Search,
  Eye,
  Rows3,
  Maximize2,
  Minimize2,
  Plus,
  X,
  Grid3X3,
  Pencil,
  XCircle,
  Layers,
  FilterX,
} from 'lucide-react'
import { usePricingRules } from '@/lib/pricing-rules-context'
import { cn } from '@/lib/utils'

interface PricingRulesToolbarProps {
  density: 'comfortable' | 'compact' | 'spacious'
  setDensity: (d: 'comfortable' | 'compact' | 'spacious') => void
  visibleColumns: Set<string>
  setVisibleColumns: (cols: Set<string>) => void
  isFullscreen: boolean
  setIsFullscreen: (fs: boolean) => void
  onNewRule: () => void
  onOpenRuleBuilder: () => void
  onOpenPublishDialog: () => void
  onOpenRuleSetEditor: (ruleSetId: string) => void
}

const ALL_COLUMNS = [
  { key: 'RuleId', label: 'Rule ID' },
  { key: 'RuleSetId', label: 'Rule Set' },
  { key: 'RuleDescription', label: 'Rule Description' },
  { key: 'Lenders', label: 'Included Lenders' },
  { key: 'Fee', label: 'Fee' },
  { key: 'Price', label: 'Price' },
  { key: 'CompPercent', label: 'Margin %' },
  { key: 'Active', label: 'Active' },
  { key: 'Disallow', label: 'Disallow' },
  { key: 'RuleIsDeleted', label: 'Deleted' },
]

export function PricingRulesToolbar({
  density,
  setDensity,
  visibleColumns,
  setVisibleColumns,
  isFullscreen,
  setIsFullscreen,
  onNewRule,
  onOpenRuleBuilder,
  onOpenPublishDialog,
  onOpenRuleSetEditor,
}: PricingRulesToolbarProps) {
  const {
    state,
    setShowDeleted,
    setSearchTerm,
    discardAllDrafts,
    getDraftCounts,
    expandRows,
    collapseAllRows,
    clearSelection,
    getRuleSets,
    setRuleSetFilter,
    clearRuleSetFilter,
    setEditingRuleSetId,
  } = usePricingRules()

  const ruleSets = getRuleSets()

  const [showSearch, setShowSearch] = useState(false)
  const draftCounts = getDraftCounts()
  const totalDrafts = draftCounts.created + draftCounts.updated + draftCounts.deleted + draftCounts.restored

  const toggleColumn = (key: string) => {
    const newCols = new Set(visibleColumns)
    if (newCols.has(key)) {
      newCols.delete(key)
    } else {
      newCols.add(key)
    }
    setVisibleColumns(newCols)
  }

  return (
    <div className="flex items-center justify-between gap-2 py-3 px-4 bg-white border-b border-gray-200 flex-wrap">
      {/* Left side - Search */}
      <div className="flex items-center gap-3 min-w-0 flex-1 sm:flex-none">
        {showSearch ? (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search rules..."
                value={state.searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-64 pl-9 h-9"
                autoFocus
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => {
                setShowSearch(false)
                setSearchTerm('')
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => setShowSearch(true)}
          >
            <Search className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Right side - Actions */}
      <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
        {/* Selection actions - only visible when rows are selected */}
        {state.selectedRows.size > 0 && (
          <>
            <Button
              onClick={() => {
                expandRows(Array.from(state.selectedRows))
              }}
              variant="outline"
              className="gap-2 border-blue-600 text-blue-600 hover:bg-blue-50"
            >
              <Pencil className="h-4 w-4" />
              Quick Edit Selected
              <Badge variant="secondary" className="ml-1 bg-blue-100 text-blue-600">
                {state.selectedRows.size}
              </Badge>
            </Button>

            <Button
              onClick={() => {
                collapseAllRows()
                clearSelection()
              }}
              variant="ghost"
              size="sm"
              className="gap-1 text-gray-500 hover:text-gray-700"
            >
              <XCircle className="h-4 w-4" />
              Clear Selection
            </Button>
          </>
        )}

        {/* Publish Changes - only visible when drafts exist */}
        {totalDrafts > 0 && (
          <>
            <Button
              onClick={onOpenPublishDialog}
              className="bg-teal-500 hover:bg-teal-600 text-white"
            >
              Publish Changes
              <Badge variant="secondary" className="ml-2 bg-teal-600 text-white">
                {totalDrafts}
              </Badge>
            </Button>

            <Button
              variant="outline"
              onClick={discardAllDrafts}
              className="border-coral-500 text-coral-500 hover:bg-coral-50 hover:text-coral-600"
            >
              Discard All
            </Button>
          </>
        )}

        {/* Rule Sets dropdown */}
        {ruleSets.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'gap-2 h-9',
                  state.ruleSetFilter && 'border-blue-600 text-blue-600 bg-blue-50'
                )}
              >
                <Layers className="h-4 w-4" />
                Rule Sets
                {state.ruleSetFilter && (
                  <Badge variant="secondary" className="ml-1 bg-blue-100 text-blue-600 text-xs">
                    1
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>Filter by Rule Set</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {ruleSets.map((rs) => (
                <div key={rs.ruleSetId} className="flex items-center justify-between px-2 py-1.5 hover:bg-gray-50 rounded-sm group">
                  <button
                    className={cn(
                      'flex-1 text-left text-sm',
                      state.ruleSetFilter === rs.ruleSetId ? 'text-blue-600 font-medium' : 'text-gray-700'
                    )}
                    onClick={() => {
                      if (state.ruleSetFilter === rs.ruleSetId) {
                        clearRuleSetFilter()
                      } else {
                        setRuleSetFilter(rs.ruleSetId)
                      }
                    }}
                  >
                    <span className="block truncate">{rs.ruleSetName}</span>
                    <span className="text-xs text-gray-400">{rs.ruleCount} rule{rs.ruleCount !== 1 ? 's' : ''}</span>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 shrink-0"
                    onClick={() => {
                      setEditingRuleSetId(rs.ruleSetId)
                      onOpenRuleSetEditor(rs.ruleSetId)
                    }}
                    title="Edit rule set"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              {state.ruleSetFilter && (
                <>
                  <DropdownMenuSeparator />
                  <button
                    className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-gray-500 hover:bg-gray-50 rounded-sm"
                    onClick={clearRuleSetFilter}
                  >
                    <FilterX className="h-4 w-4" />
                    Clear filter
                  </button>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Active rule set filter chip */}
        {state.ruleSetFilter && (() => {
          const activeSet = ruleSets.find(rs => rs.ruleSetId === state.ruleSetFilter)
          return activeSet ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-100 border border-blue-300 text-blue-700 text-xs font-medium">
              <Layers className="h-3 w-3" />
              <span className="max-w-[120px] truncate">{activeSet.ruleSetName}</span>
              <button
                onClick={clearRuleSetFilter}
                className="ml-0.5 hover:text-blue-900"
                aria-label="Clear rule set filter"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : null
        })()}

        {/* Selection actions - only visible when rows are selected and editing by rule set */}
        {state.selectedRows.size > 0 && state.ruleSetFilter && (
          <Button
            onClick={() => {
              const activeSet = ruleSets.find(rs => rs.ruleSetId === state.ruleSetFilter)
              if (activeSet) {
                setEditingRuleSetId(state.ruleSetFilter)
                onOpenRuleSetEditor(state.ruleSetFilter)
              }
            }}
            variant="outline"
            className="gap-2 border-blue-600 text-blue-600 hover:bg-blue-50"
          >
            <Pencil className="h-4 w-4" />
            Edit Rule Set
            <Badge variant="secondary" className="ml-1 bg-blue-100 text-blue-600">
              {state.selectedRows.size}
            </Badge>
          </Button>
        )}

        {/* Export Rules */}
        <Button variant="link" className="text-blue-600 hover:text-blue-700 hover:underline gap-2">
          <Download className="h-4 w-4" />
          Export Rules
        </Button>

        {/* Show Deleted Toggle */}
        <div className="flex items-center gap-2">
          <Label htmlFor="show-deleted" className="text-sm text-muted-foreground">
            Show Deleted
          </Label>
          <Switch
            id="show-deleted"
            checked={state.showDeleted}
            onCheckedChange={setShowDeleted}
          />
        </div>

        {/* Column Visibility */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="h-9 w-9 hover:bg-gray-50 hover:text-gray-900">
              <Eye className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {ALL_COLUMNS.map((col) => (
              <DropdownMenuCheckboxItem
                key={col.key}
                checked={visibleColumns.has(col.key)}
                onCheckedChange={() => toggleColumn(col.key)}
              >
                {col.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Density */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="h-9 w-9 hover:bg-gray-50 hover:text-gray-900">
              <Rows3 className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Table Density</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={density === 'compact'}
              onCheckedChange={() => setDensity('compact')}
            >
              Compact
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={density === 'comfortable'}
              onCheckedChange={() => setDensity('comfortable')}
            >
              Comfortable
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={density === 'spacious'}
              onCheckedChange={() => setDensity('spacious')}
            >
              Spacious
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Fullscreen Toggle */}
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 hover:bg-gray-50 hover:text-gray-900"
          onClick={() => setIsFullscreen(!isFullscreen)}
        >
          {isFullscreen ? (
            <Minimize2 className="h-4 w-4" />
          ) : (
            <Maximize2 className="h-4 w-4" />
          )}
        </Button>

        {/* Bulk Rule Builder */}
        <Button
          variant="outline"
          onClick={onOpenRuleBuilder}
          className="gap-2"
        >
          <Grid3X3 className="h-4 w-4" />
          Bulk Rule Builder
        </Button>

        {/* New Rule */}
        <Button
          onClick={onNewRule}
          className="bg-blue-600 hover:bg-blue-700 text-white gap-2 font-medium"
        >
          <Plus className="h-4 w-4" />
          New Rule
        </Button>
      </div>
    </div>
  )
}
