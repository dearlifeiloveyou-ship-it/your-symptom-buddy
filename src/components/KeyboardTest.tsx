import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const KeyboardTest = () => {
  const [inputText, setInputText] = useState('');
  const [keyPresses, setKeyPresses] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    console.log('Key pressed:', e.key, e.code);
    setKeyPresses(prev => [...prev.slice(-9), `${e.key} (${e.code})`]);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('Input changed:', e.target.value);
    setInputText(e.target.value);
  };

  useEffect(() => {
    // Auto-focus the input when component mounts
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Keyboard Test</CardTitle>
        <CardDescription>Test if keyboard input is working</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label htmlFor="test-input" className="block text-sm font-medium mb-2">
            Type here (including spaces):
          </label>
          <input
            ref={inputRef}
            id="test-input"
            type="text"
            value={inputText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onKeyPress={(e) => console.log('Key press event:', e.key)}
            onInput={(e) => console.log('Input event:', (e.target as HTMLInputElement).value)}
            placeholder="Test typing here..."
            className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            autoFocus
          />
        </div>
        
        <div>
          <p className="text-sm font-medium mb-2">Input value: "{inputText}"</p>
          <p className="text-sm font-medium mb-2">Recent key presses:</p>
          <div className="text-xs bg-muted p-2 rounded max-h-20 overflow-y-auto">
            {keyPresses.length === 0 ? (
              <span className="text-muted-foreground">No keys pressed yet</span>
            ) : (
              keyPresses.map((key, index) => (
                <div key={index}>{key}</div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default KeyboardTest;