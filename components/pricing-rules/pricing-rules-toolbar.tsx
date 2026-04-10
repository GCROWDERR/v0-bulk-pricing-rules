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
} from 'lucide-react'
import { usePricingRules } from '@/lib/pricing-rules-context'

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
}

const ALL_COLUMNS = [
  { key: 'RuleId', label: 'Rule ID' },
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
  } = usePricingRules()

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
    <div className="flex items-center justify-between py-3 px-4 bg-white border-b border-gray-200">
      {/* Left side - Search */}
      <div className="flex items-center gap-3">
        {showSearch ? (
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search rules..."
                value={state.searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64 pl-9 h-9"
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
      <div className="flex items-center gap-3">
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
            <Button variant="outline" size="icon" className="h-9 w-9 hover:bg-gray-700 hover:text-white">
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
            <Button variant="outline" size="icon" className="h-9 w-9 hover:bg-gray-700 hover:text-white">
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
          className="h-9 w-9 hover:bg-gray-700 hover:text-white"
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
