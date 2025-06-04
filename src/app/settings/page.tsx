"use client";

import { useRef } from 'react';
import { GameLayout } from '@/components/layout/GameLayout';
import { useGame } from '@/context/GameContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, Save, Upload, RotateCcw, Trash2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const { saveGame, loadGame, exportSave, importSave, resetGame } = useGame();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const jsonData = await file.text();
        if(importSave(jsonData)) {
          toast({ title: "Game Data Imported", description: "Your game state has been loaded from the file." });
        } else {
          toast({ title: "Import Failed", description: "The file was not a valid save.", variant: "destructive" });
        }
      } catch (error) {
        console.error("Error reading file:", error);
        toast({ title: "Import Error", description: "Could not read the selected file.", variant: "destructive" });
      }
      // Reset file input to allow importing the same file again if needed
      if(fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <GameLayout>
      <div className="container mx-auto py-8 max-w-2xl">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline text-2xl flex items-center gap-2">
              <Settings className="text-primary h-7 w-7" />
              Temporal Controls
            </CardTitle>
            <CardDescription>Manage your game data and preferences.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Save Management</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Button onClick={saveGame}><Save className="mr-2 h-4 w-4" /> Manual Save</Button>
                <Button onClick={loadGame} variant="outline">Load Last Autosave</Button>
                <Button onClick={exportSave}><Upload className="mr-2 h-4 w-4" /> Export Save</Button>
                <div>
                  <Button onClick={handleImportClick} variant="outline" className="w-full">
                    <Upload className="mr-2 h-4 w-4" /> Import Save
                  </Button>
                  <Input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept=".json" 
                    onChange={handleFileChange} 
                  />
                </div>
              </div>
                <p className="text-xs text-muted-foreground pt-2">
                    Your game is auto-saved to your browser's local storage periodically.
                    Use export/import to transfer saves between devices or browsers.
                </p>
            </div>

            <div className="space-y-2 border-t pt-6">
              <h3 className="text-lg font-semibold text-destructive">Danger Zone</h3>
              <Button onClick={resetGame} variant="destructive" className="w-full sm:w-auto">
                <Trash2 className="mr-2 h-4 w-4" /> Reset Game Progress
              </Button>
              <p className="text-xs text-muted-foreground">
                Warning: This will permanently delete all your current game data from this browser.
                Export your save first if you want to keep a backup.
              </p>
            </div>

            {/* Placeholder for other settings */}
            {/* <div className="space-y-2 border-t pt-6">
              <h3 className="text-lg font-semibold">Preferences</h3>
              <div className="flex items-center space-x-2">
                <Switch id="dark-mode" />
                <Label htmlFor="dark-mode">Dark Mode (Coming Soon)</Label>
              </div>
            </div> */}
          </CardContent>
        </Card>
      </div>
    </GameLayout>
  );
}
