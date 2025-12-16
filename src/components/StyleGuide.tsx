import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { StatusBadge } from './casazero/StatusBadge';
import { RoleBadge } from './casazero/RoleBadge';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Switch } from './ui/switch';
import { Slider } from './ui/slider';
import { Checkbox } from './ui/checkbox';
import casazeroLogo from 'figma:asset/f1971ba654cdd5f64a8a1c117d59b8bac1719bb4.png';

export function StyleGuide() {
  return (
    <div className="min-h-screen bg-surface-warm-50 p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center mb-12">
          <img src={casazeroLogo} alt="CasaZero" className="h-16 mx-auto mb-4" />
          <h1 className="text-3xl mb-2">CasaZero Design System</h1>
          <p className="text-neutral-ink-500">Component library and style guide</p>
        </div>

        {/* Color Palette */}
        <Card>
          <CardHeader>
            <CardTitle>Color Palette</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Brand Colors */}
            <div>
              <h3 className="text-sm mb-3">Brand - Sage</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="h-20 rounded-lg bg-brand-sage-600 mb-2" />
                  <p className="text-xs">Sage 600</p>
                  <p className="text-xs text-neutral-ink-500">#388E3C</p>
                </div>
                <div>
                  <div className="h-20 rounded-lg bg-brand-sage-500 mb-2" />
                  <p className="text-xs">Sage 500</p>
                  <p className="text-xs text-neutral-ink-500">#4CAF47</p>
                </div>
                <div>
                  <div className="h-20 rounded-lg bg-brand-sage-300 mb-2" />
                  <p className="text-xs">Sage 300</p>
                  <p className="text-xs text-neutral-ink-500">#81C784</p>
                </div>
              </div>
            </div>

            {/* Accent */}
            <div>
              <h3 className="text-sm mb-3">Accent</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="h-20 rounded-lg bg-accent-lime-500 mb-2" />
                  <p className="text-xs">Lime 500</p>
                  <p className="text-xs text-neutral-ink-500">#4CD964</p>
                </div>
              </div>
            </div>

            {/* Semantic Colors */}
            <div>
              <h3 className="text-sm mb-3">Semantic</h3>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <div className="h-20 rounded-lg bg-success mb-2" />
                  <p className="text-xs">Success</p>
                  <p className="text-xs text-neutral-ink-500">#2FB476</p>
                </div>
                <div>
                  <div className="h-20 rounded-lg bg-warning mb-2" />
                  <p className="text-xs">Warning</p>
                  <p className="text-xs text-neutral-ink-500">#FFB020</p>
                </div>
                <div>
                  <div className="h-20 rounded-lg bg-danger mb-2" />
                  <p className="text-xs">Danger</p>
                  <p className="text-xs text-neutral-ink-500">#E25555</p>
                </div>
                <div>
                  <div className="h-20 rounded-lg bg-info mb-2" />
                  <p className="text-xs">Info</p>
                  <p className="text-xs text-neutral-ink-500">#3B82F6</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Typography */}
        <Card>
          <CardHeader>
            <CardTitle>Typography</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h1>Heading 1 - Inter Semibold</h1>
              <h2>Heading 2 - Inter Semibold</h2>
              <h3>Heading 3 - Inter Semibold</h3>
              <h4>Heading 4 - Inter Semibold</h4>
            </div>
            <div>
              <p>Body text - Inter Regular, 16px base size with 1.5 line height</p>
              <p className="text-sm text-neutral-ink-500">
                Secondary text - Smaller size for metadata and supporting information
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Buttons */}
        <Card>
          <CardHeader>
            <CardTitle>Buttons</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Button>Primary Button</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button size="sm">Small</Button>
              <Button size="default">Default</Button>
              <Button size="lg">Large</Button>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button disabled>Disabled</Button>
              <Button>
                <span className="mr-2">With Icon</span>
                →
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Badges */}
        <Card>
          <CardHeader>
            <CardTitle>Badges & Status Indicators</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="text-sm mb-3">Standard Badges</h4>
              <div className="flex flex-wrap gap-2">
                <Badge>Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="outline">Outline</Badge>
                <Badge variant="destructive">Destructive</Badge>
              </div>
            </div>
            <div>
              <h4 className="text-sm mb-3">Priority Badges</h4>
              <div className="flex flex-wrap gap-2">
                <StatusBadge type="priority" value="N1" />
                <StatusBadge type="priority" value="N2" />
                <StatusBadge type="priority" value="N3" />
              </div>
            </div>
            <div>
              <h4 className="text-sm mb-3">Status Badges</h4>
              <div className="flex flex-wrap gap-2">
                <StatusBadge type="status" value="pending" />
                <StatusBadge type="status" value="in-progress" />
                <StatusBadge type="status" value="completed" />
                <StatusBadge type="status" value="overdue" />
              </div>
            </div>
            <div>
              <h4 className="text-sm mb-3">Role Badges</h4>
              <div className="flex flex-wrap gap-2">
                <RoleBadge role="client" />
                <RoleBadge role="admin" />
                <RoleBadge role="super-admin" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form Inputs */}
        <Card>
          <CardHeader>
            <CardTitle>Form Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm">Text Input</label>
              <Input placeholder="Enter text..." />
            </div>
            <div className="space-y-2">
              <label className="text-sm">Textarea</label>
              <Textarea placeholder="Enter longer text..." rows={3} />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch id="demo-switch" />
                <label htmlFor="demo-switch" className="text-sm">Switch</label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="demo-checkbox" />
                <label htmlFor="demo-checkbox" className="text-sm">Checkbox</label>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm">Slider</label>
              <Slider defaultValue={[50]} max={100} step={1} />
            </div>
          </CardContent>
        </Card>

        {/* Cards */}
        <Card>
          <CardHeader>
            <CardTitle>Card Components</CardTitle>
          </CardHeader>
          <CardContent>
            <Card className="mb-4">
              <CardHeader>
                <CardTitle>Card Title</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-neutral-ink-500">
                  Cards are the primary container for content. They use rounded-xl corners (12-16px)
                  and soft shadows following Material 3 principles.
                </p>
              </CardContent>
            </Card>
          </CardContent>
        </Card>

        {/* Spacing & Layout */}
        <Card>
          <CardHeader>
            <CardTitle>Spacing System</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-neutral-ink-500">
              Using Tailwind's default spacing scale (4px base unit)
            </p>
            <div className="space-y-2">
              <div className="h-2 bg-brand-sage-600 rounded" style={{ width: '16px' }} />
              <p className="text-xs">4px (space-1)</p>
            </div>
            <div className="space-y-2">
              <div className="h-2 bg-brand-sage-600 rounded" style={{ width: '32px' }} />
              <p className="text-xs">8px (space-2)</p>
            </div>
            <div className="space-y-2">
              <div className="h-2 bg-brand-sage-600 rounded" style={{ width: '48px' }} />
              <p className="text-xs">12px (space-3)</p>
            </div>
            <div className="space-y-2">
              <div className="h-2 bg-brand-sage-600 rounded" style={{ width: '64px' }} />
              <p className="text-xs">16px (space-4)</p>
            </div>
          </CardContent>
        </Card>

        {/* Border Radius */}
        <Card>
          <CardHeader>
            <CardTitle>Border Radius</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <div className="h-20 bg-brand-sage-300 rounded-sm mb-2" />
                <p className="text-xs">rounded-sm</p>
              </div>
              <div>
                <div className="h-20 bg-brand-sage-300 rounded-md mb-2" />
                <p className="text-xs">rounded-md</p>
              </div>
              <div>
                <div className="h-20 bg-brand-sage-300 rounded-lg mb-2" />
                <p className="text-xs">rounded-lg</p>
              </div>
              <div>
                <div className="h-20 bg-brand-sage-300 rounded-xl mb-2" />
                <p className="text-xs">rounded-xl (primary)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
