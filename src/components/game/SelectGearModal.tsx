
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card"; // Removed CardHeader, CardContent as not used directly for list items here
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Item, CharacterSlotType } from '@/lib/types';
import { CheckCircle } from 'lucide-react'; // Removed Package, relying on getIcon

interface SelectGearModalProps {
  isOpen: boolean;
  onClose: () => void;
  slotToEquip: CharacterSlotType | null;
  availableItems: Array<{ item: Item; quantity: number }>;
  onEquipItem: (itemId: string, slot: CharacterSlotType) => void;
  getIcon: (iconName?: string) => React.ElementType; // Passed from CharacterPage
}

export function SelectGearModal({
  isOpen,
  onClose,
  slotToEquip,
  availableItems,
  onEquipItem,
  getIcon,
}: SelectGearModalProps) {
  if (!isOpen || !slotToEquip) return null; // Ensure isOpen is also checked

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card text-card-foreground shadow-xl rounded-lg">
        <DialogHeader>
          <DialogTitle className="font-headline text-xl text-primary capitalize">
            Equip to {slotToEquip.replace(/([A-Z0-9])/g, ' $1').trim()}
          </DialogTitle>
          <DialogDescription>
            Choose an item from your inventory.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] p-1 mt-2 border-t border-b">
          {availableItems.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No suitable items in your inventory for this slot.</p>
          ) : (
            <div className="space-y-2 py-2">
              {availableItems.map(({ item, quantity }) => {
                const Icon = getIcon(item.icon);
                return (
                  <Card 
                    key={item.id} 
                    className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => { // Make the whole card clickable
                      onEquipItem(item.id, slotToEquip);
                      onClose(); 
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-8 w-8 text-primary shrink-0" />
                      <div className="min-w-0"> {/* For text truncation */}
                        <p className="font-semibold truncate" title={item.name}>{item.name}</p>
                        <p className="text-xs text-muted-foreground">Qty: {quantity}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="ml-2" // Add some margin
                      onClick={(e) => { // Prevent card click if button is clicked directly
                        e.stopPropagation(); 
                        onEquipItem(item.id, slotToEquip);
                        onClose(); 
                      }}
                      aria-label={`Equip ${item.name}`}
                    >
                      <CheckCircle className="mr-1 h-4 w-4" /> Equip
                    </Button>
                  </Card>
                );
              })}
            </div>
          )}
        </ScrollArea>
        <DialogFooter className="mt-2">
          <DialogClose asChild>
            <Button type="button" variant="outline" className="w-full">Cancel</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    