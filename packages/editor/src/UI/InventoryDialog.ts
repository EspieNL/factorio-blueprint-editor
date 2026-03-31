import { Container, Text, Graphics } from 'pixi.js'
import FD from '../core/factorioData'
import G from '../common/globals'
import F from './controls/functions'
import { Dialog } from './controls/Dialog'
import { Button } from './controls/Button'
import { colors, styles } from './style'

/*
    Space Age Support - Enhanced Layout (Ready for Factorio 2.0 Space Age)

    This dialog has been upgraded to handle:
    - Dynamic group layouts with unlimited item groups
    - Horizontal scrolling when groups exceed viewport width
    - Future Space Age item groups (planets, space-platform, etc.)
    
    Note: Space Age item groups will appear once data.json is regenerated
    with the latest Factorio exporter. See SPACE_AGE_DATA_UPDATE.md for details.

    Cols
    Space   @ 0     +12                  ->12
    Items   @ 12    +(10*(36+2))         ->392
    Space   @ 392   +12                  ->404
    Width : 12 + (10 * (36 + 2)) + 12 = 404 (minimum)
    
    Calculated with Space Age groups in mind:
    Groups can now scroll horizontally if they exceed 520px width capacity
    
    Rows
    Space   @ 0   +10                ->10
    Title   @ 10  +24                ->34
    Space   @ 34  +12                ->46
    Groups  @ 46  +68                ->114  (scrollable container added)
    Space   @ 114 +12                ->126
    Items   @ 126 +(10*(36+2))       ->506
    Space   @ 506 +12                ->518
    Height : 10 + 24 + 12 + 68 + 12 + (10*(36+2)) + 12 = 518

    Space   @ 0   +10                ->10
    R.Label @ 10  +16                ->26
    Space   @ 26  +10                ->36
    R.Data  @ 36  +36                ->72
    Space   @ 8   +8                 ->78
    Height : 10 + 16 + 10 + 36 + 8 = 78
*/

type InventoryItems = Container<Button<Container>>

const QUALITY_OPTIONS = [
    { id: 'normal', short: 'N', label: 'Normal' },
    { id: 'uncommon', short: 'U', label: 'Uncommon' },
    { id: 'rare', short: 'R', label: 'Rare' },
    { id: 'epic', short: 'E', label: 'Epic' },
    { id: 'legendary', short: 'L', label: 'Legendary' },
] as const

type ItemQuality = (typeof QUALITY_OPTIONS)[number]['id']

/** Inventory Dialog - Displayed to the user if there is a need to select an item */
export class InventoryDialog extends Dialog {
    /** Container for Inventory Group Buttons (scrollable) */
    private readonly m_InventoryGroupsContainer: Container

    /** Mask for group buttons scrolling */
    private readonly m_GroupsMask: Graphics

    /** Container for Inventory Group Buttons */
    private readonly m_InventoryGroups: Container<Button<InventoryItems>>

    /** Container for Inventory Group Items */
    private readonly m_InventoryItems: Container<InventoryItems>

    /** Mask for item grid scrolling */
    private readonly m_ItemsMask: Graphics

    /** Text for Recipe Tooltip */
    private readonly m_RecipeLabel: Text

    /** Container for Recipe Tooltip */
    private readonly m_RecipeContainer: Container

    /** Hovered item for item pointerout check */
    private m_hoveredItem: string

    /** Active quality selected in footer */
    private m_SelectedQuality: ItemQuality = 'normal'

    /** Text label for selected quality */
    private readonly m_QualityLabel: Text

    /** Footer quality selector buttons */
    private readonly m_QualityButtons: Button<ItemQuality>[] = []

    /** Base width for the dialog */
    private readonly m_BaseWidth: number = 520

    /** Group buttons scroll position */
    private m_GroupsScrollX: number = 0

    /** Maximum groups width */
    private m_MaxGroupsWidth: number = 0

    /** Item grid scroll position */
    private m_ItemsScrollY: number = 0

    /** Maximum item grid height for the active group */
    private m_MaxItemsHeight: number = 0

    /** Cached item grid heights by group */
    private readonly m_ItemsHeightByGroup = new Map<InventoryItems, number>()

    public constructor(
        title = 'Inventory',
        itemsFilter?: string[],
        selectedCallBack?: (selectedItem: string, quality?: string) => void
    ) {
        // Calculate dynamic dimensions based on content
        const calculatedWidth = Math.min(520, Math.max(404, 500)) // Start with reasonable defaults
        const calculatedHeight = 518

        super(calculatedWidth, calculatedHeight, title)

        // Create scrollable groups container with mask
        this.m_GroupsMask = new Graphics()
        this.m_GroupsMask.rect(12, 46, calculatedWidth - 24, 68)
        this.m_GroupsMask.fill({ color: 0xffffff })
        this.addChild(this.m_GroupsMask)

        this.m_InventoryGroupsContainer = new Container()
        this.m_InventoryGroupsContainer.position.set(12, 46)
        this.m_InventoryGroupsContainer.mask = this.m_GroupsMask
        this.addChild(this.m_InventoryGroupsContainer)

        this.m_InventoryGroups = new Container()
        this.m_InventoryGroups.position.set(0, 0)
        this.m_InventoryGroupsContainer.addChild(this.m_InventoryGroups)

        this.m_InventoryItems = new Container()
        this.m_InventoryItems.position.set(12, 126)

        this.m_ItemsMask = new Graphics()
        this.m_ItemsMask.rect(12, 126, calculatedWidth - 24, 10 * 38)
        this.m_ItemsMask.fill({ color: 0xffffff })
        this.addChild(this.m_ItemsMask)

        this.m_InventoryItems.mask = this.m_ItemsMask
        this.addChild(this.m_InventoryItems)

        let groupIndex = 0
        for (const group of FD.inventoryLayout) {
            // Make creative entities available only in the main inventory
            if (group.name === 'creative' && itemsFilter !== undefined) {
                continue
            }

            const inventoryGroupItems = new Container<Button<Container>>()
            const fallbackGroupItemNames: string[] = []
            let itemColIndex = 0
            let itemRowIndex = 0

            for (const subgroup of group.subgroups) {
                let subgroupHasItems = false

                for (const item of subgroup.items) {
                    fallbackGroupItemNames.push(item.name)

                    if (itemsFilter === undefined) {
                        const itemData = FD.items[item.name]
                        if (!itemData) continue
                        if (!itemData.place_result && !itemData.place_as_tile) continue
                        // needed for robots/trains/cars
                        if (itemData.place_result && !FD.entities[itemData.place_result]) continue
                    } else {
                        if (!itemsFilter.includes(item.name)) continue
                    }

                    if (itemColIndex === 10) {
                        itemColIndex = 0
                        itemRowIndex += 1
                    }

                    const button = new Button<Container>(36, 36)
                    button.position.set(itemColIndex * 38, itemRowIndex * 38)
                    button.content = F.CreateIcon(item.name)
                    button.on('pointerdown', e => {
                        e.stopPropagation()
                        if (e.button === 0) {
                            selectedCallBack(item.name, this.getSelectedQuality())
                            this.close()
                        }
                    })
                    button.on('pointerover', () => {
                        this.m_hoveredItem = item.name
                        this.updateRecipeVisualization(item.name)
                    })
                    button.on('pointerout', () => {
                        // we have to check this because pointerout can fire after pointerover
                        if (this.m_hoveredItem === item.name) {
                            this.m_hoveredItem = undefined
                            this.updateRecipeVisualization(undefined)
                        }
                    })

                    inventoryGroupItems.addChild(button)

                    itemColIndex += 1
                    subgroupHasItems = true
                    // }
                }

                if (subgroupHasItems) {
                    itemRowIndex += 1
                    itemColIndex = 0
                }
            }

            if (inventoryGroupItems.children.length > 0) {
                inventoryGroupItems.visible = groupIndex === 0
                inventoryGroupItems.interactiveChildren = groupIndex === 0
                this.m_InventoryItems.addChild(inventoryGroupItems)

                this.m_ItemsHeightByGroup.set(inventoryGroupItems, itemRowIndex * 38)

                const button = new Button<Container<Button<Container>>>(68, 68, 3)
                button.active = groupIndex === 0
                button.position.set(groupIndex * 70, 0)
                button.content = this.createGroupIcon(
                    group.name,
                    fallbackGroupItemNames,
                    group.name === 'creative' ? 32 : 64
                )
                button.data = inventoryGroupItems
                button.on('pointerdown', e => {
                    e.stopPropagation()
                    if (e.button === 0) {
                        if (!button.active) {
                            for (const inventoryGroup of this.m_InventoryGroups.children) {
                                inventoryGroup.active = inventoryGroup === button
                            }
                        }
                        const buttonData = button.data
                        if (!buttonData.visible) {
                            for (const inventoryGroupItems of this.m_InventoryItems.children) {
                                inventoryGroupItems.visible = inventoryGroupItems === buttonData
                                inventoryGroupItems.interactiveChildren =
                                    inventoryGroupItems === buttonData
                            }
                            this.updateItemsScroll(buttonData)
                        }

                        // Auto-scroll to keep button visible
                        this.scrollGroupButtonIntoView(button.position.x)
                    }
                })

                this.m_InventoryGroups.addChild(button)
                this.m_MaxGroupsWidth = (groupIndex + 1) * 70

                groupIndex += 1
            }
        }

        const recipePanel = new Container()
        recipePanel.position.set(0, calculatedHeight)
        this.addChild(recipePanel)

        const recipeBackground = F.DrawRectangle(
            calculatedWidth,
            78,
            colors.dialog.background.color,
            colors.dialog.background.alpha,
            colors.dialog.background.border
        )
        recipeBackground.position.set(0, 0)
        recipePanel.addChild(recipeBackground)

        this.m_RecipeLabel = new Text({ text: '', style: styles.dialog.label })
        this.m_RecipeLabel.position.set(12, 10)
        recipePanel.addChild(this.m_RecipeLabel)

        this.m_RecipeContainer = new Container()
        this.m_RecipeContainer.position.set(12, 36)
        recipePanel.addChild(this.m_RecipeContainer)

        const qualityTitle = new Text({ text: 'Quality', style: styles.dialog.label })
        qualityTitle.position.set(calculatedWidth - 182, 10)
        recipePanel.addChild(qualityTitle)

        this.m_QualityLabel = new Text({ text: '', style: styles.dialog.label })
        this.m_QualityLabel.position.set(calculatedWidth - 120, 10)
        recipePanel.addChild(this.m_QualityLabel)

        const qualityButtons = new Container()
        qualityButtons.position.set(calculatedWidth - 180, 36)
        recipePanel.addChild(qualityButtons)

        for (const [index, option] of QUALITY_OPTIONS.entries()) {
            const qualityButton = new Button<ItemQuality>(32, 32, 1)
            qualityButton.position.set(index * 34, 0)
            qualityButton.data = option.id
            qualityButton.content = new Text({ text: option.short, style: styles.dialog.label })
            qualityButton.active = option.id === this.m_SelectedQuality
            qualityButton.on('pointerdown', e => {
                e.stopPropagation()
                if (e.button !== 0) return
                this.m_SelectedQuality = qualityButton.data
                this.updateQualitySelector()
            })
            this.m_QualityButtons.push(qualityButton)
            qualityButtons.addChild(qualityButton)
        }

        this.updateQualitySelector()

        // Enable mouse wheel scrolling for groups if they overflow
        this.setupGroupScrolling(calculatedWidth)

        // Enable mouse wheel scrolling for item grid if active group overflows vertically
        this.setupItemScrolling()

        const firstGroup = this.m_InventoryItems.children.find(group => group.visible)
        if (firstGroup) {
            this.updateItemsScroll(firstGroup)
        }
    }

    /** Create a robust group icon, falling back to subgroup items for unknown groups. */
    private createGroupIcon(groupName: string, fallbackItemNames: string[], size: number): Container {
        try {
            return F.CreateIcon(groupName, size)
        } catch {
            for (const itemName of fallbackItemNames) {
                if (FD.items[itemName]) {
                    return F.CreateIcon(itemName, Math.min(size, 48))
                }
            }

            const fallback = new Text({ text: '?', style: styles.dialog.label })
            fallback.anchor.set(0.5)
            const out = new Container()
            out.addChild(fallback)
            return out
        }
    }

    /** Setup mouse wheel scrolling for group buttons */
    private setupGroupScrolling(containerWidth: number): void {
        const scrollableWidth = containerWidth - 24 // Account for padding

        this.m_InventoryGroupsContainer.interactive = true
        this.m_InventoryGroupsContainer.on('wheel', (e: any) => {
            if (this.m_MaxGroupsWidth <= scrollableWidth) return

            e.preventDefault()
            const scrollAmount = (e.deltaY > 0 ? 1 : -1) * 70 // Scroll by one group width
            const newScrollX = Math.max(0, Math.min(this.m_GroupsScrollX + scrollAmount, this.m_MaxGroupsWidth - scrollableWidth))

            if (newScrollX !== this.m_GroupsScrollX) {
                this.m_GroupsScrollX = newScrollX
                this.m_InventoryGroups.position.x = -this.m_GroupsScrollX
            }
        })
    }

    /** Setup mouse wheel scrolling for item grid */
    private setupItemScrolling(): void {
        const visibleHeight = 10 * 38

        this.m_InventoryItems.interactive = true
        this.m_InventoryItems.on('wheel', (e: any) => {
            if (this.m_MaxItemsHeight <= visibleHeight) return

            e.preventDefault()

            const scrollStep = 38
            const scrollAmount = (e.deltaY > 0 ? 1 : -1) * scrollStep
            const maxScroll = Math.max(0, this.m_MaxItemsHeight - visibleHeight)
            const newScrollY = Math.max(0, Math.min(this.m_ItemsScrollY + scrollAmount, maxScroll))

            if (newScrollY !== this.m_ItemsScrollY) {
                this.m_ItemsScrollY = newScrollY
                this.m_InventoryItems.position.y = 126 - this.m_ItemsScrollY
            }
        })
    }

    /** Reset and clamp item grid scroll when changing active group */
    private updateItemsScroll(group: InventoryItems): void {
        this.m_MaxItemsHeight = this.m_ItemsHeightByGroup.get(group) || 0
        this.m_ItemsScrollY = 0
        this.m_InventoryItems.position.y = 126
    }

    /** Scroll a group button into view */
    private scrollGroupButtonIntoView(buttonX: number): void {
        const containerWidth = this.width - 24
        const buttonCenter = buttonX + 34 // Button is 68px wide, center is at +34
        const visibleStart = this.m_GroupsScrollX
        const visibleEnd = this.m_GroupsScrollX + containerWidth

        if (buttonCenter < visibleStart + 50) {
            // Scroll left
            this.m_GroupsScrollX = Math.max(0, buttonCenter - 50)
        } else if (buttonCenter > visibleEnd - 50) {
            // Scroll right
            this.m_GroupsScrollX = Math.min(this.m_MaxGroupsWidth - containerWidth, buttonCenter - containerWidth + 50)
        }

        this.m_InventoryGroups.position.x = -this.m_GroupsScrollX
    }

    /** Override automatically set position of dialog due to additional area for recipe */
    protected override setPosition(): void {
        this.position.set(
            G.app.screen.width / 2 - this.width / 2,
            G.app.screen.height / 2 - (this.height + 78) / 2
        )
    }

    /** Update recipe visualization */
    private updateRecipeVisualization(recipeName?: string): void {
        // Update Recipe Label
        this.m_RecipeLabel.text = ''

        // Update Recipe Container
        this.m_RecipeContainer.removeChildren()

        if (recipeName === undefined) return

        const item = FD.items[recipeName]
        if (item && item.subgroup === 'creative') {
            this.m_RecipeLabel.text = `[CREATIVE] - ${item.localised_name}`
        }

        const recipe = FD.recipes[recipeName]
        if (recipe === undefined) return
        this.m_RecipeLabel.text = recipe.localised_name

        F.CreateRecipe(
            this.m_RecipeContainer,
            0,
            0,
            recipe.ingredients,
            recipe.results,
            recipe.energy_required
        )
    }

    /** Convert selected quality into blueprint format where normal is omitted. */
    private getSelectedQuality(): string | undefined {
        return this.m_SelectedQuality === 'normal' ? undefined : this.m_SelectedQuality
    }

    /** Keep footer quality buttons and label synchronized. */
    private updateQualitySelector(): void {
        for (const button of this.m_QualityButtons) {
            button.active = button.data === this.m_SelectedQuality
        }
        this.m_QualityLabel.text = QUALITY_OPTIONS.find(
            quality => quality.id === this.m_SelectedQuality
        ).label
    }
}
