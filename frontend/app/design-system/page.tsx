/**
 * Design System Documentation Page
 *
 * Showcases all design tokens, components, and patterns
 */

'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { Alert } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar } from '@/components/ui/avatar';
import { DarkModeToggle } from '@/components/ui/dark-mode-toggle';

export default function DesignSystemPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-12 px-4">
        {/* Header */}
        <div className="mb-12 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2">ArtiConnect Design System</h1>
            <p className="text-muted-foreground">
              Component library and design tokens documentation
            </p>
          </div>
          <DarkModeToggle showLabel />
        </div>

        <Tabs defaultValue="colors" className="space-y-8">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="colors">Colors</TabsTrigger>
            <TabsTrigger value="components">Components</TabsTrigger>
            <TabsTrigger value="typography">Typography</TabsTrigger>
            <TabsTrigger value="animations">Animations</TabsTrigger>
          </TabsList>

          {/* Colors Tab */}
          <TabsContent value="colors" className="space-y-8">
            <section>
              <h2 className="text-2xl font-bold mb-4">Color Palette</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Primary */}
                <Card>
                  <CardHeader>
                    <CardTitle>Primary</CardTitle>
                    <CardDescription>Main brand color</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="h-20 bg-primary rounded-lg" />
                      <p className="text-xs text-muted-foreground">
                        HSL: 217 91% 60%<br />
                        HEX: #2563EB
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Secondary */}
                <Card>
                  <CardHeader>
                    <CardTitle>Secondary</CardTitle>
                    <CardDescription>Supporting color</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="h-20 bg-secondary rounded-lg" />
                      <p className="text-xs text-muted-foreground">
                        HSL: 210 40% 96.1%
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Accent */}
                <Card>
                  <CardHeader>
                    <CardTitle>Accent</CardTitle>
                    <CardDescription>Highlight elements</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="h-20 bg-accent rounded-lg" />
                      <p className="text-xs text-muted-foreground">
                        HSL: 210 40% 96.1%
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Destructive */}
                <Card>
                  <CardHeader>
                    <CardTitle>Destructive</CardTitle>
                    <CardDescription>Errors and warnings</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="h-20 bg-destructive rounded-lg" />
                      <p className="text-xs text-muted-foreground">
                        HSL: 0 84.2% 60.2%
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Muted */}
                <Card>
                  <CardHeader>
                    <CardTitle>Muted</CardTitle>
                    <CardDescription>Subtle backgrounds</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="h-20 bg-muted rounded-lg" />
                      <p className="text-xs text-muted-foreground">
                        HSL: 210 40% 96.1%
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Background */}
                <Card>
                  <CardHeader>
                    <CardTitle>Background</CardTitle>
                    <CardDescription>Main background</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="h-20 bg-background border-2 border-border rounded-lg" />
                      <p className="text-xs text-muted-foreground">
                        HSL: 0 0% 100%
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </section>
          </TabsContent>

          {/* Components Tab */}
          <TabsContent value="components" className="space-y-8">
            {/* Buttons */}
            <section>
              <h2 className="text-2xl font-bold mb-4">Buttons</h2>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-wrap gap-4">
                    <Button variant="default">Default</Button>
                    <Button variant="secondary">Secondary</Button>
                    <Button variant="outline">Outline</Button>
                    <Button variant="ghost">Ghost</Button>
                    <Button variant="link">Link</Button>
                    <Button variant="destructive">Destructive</Button>
                    <Button disabled>Disabled</Button>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-4">
                    <Button size="sm">Small</Button>
                    <Button size="default">Default</Button>
                    <Button size="lg">Large</Button>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Cards */}
            <section>
              <h2 className="text-2xl font-bold mb-4">Cards</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="hover-lift">
                  <CardHeader>
                    <CardTitle>Card Title</CardTitle>
                    <CardDescription>Card description goes here</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Card content with some example text to show how it looks.
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Button>Action</Button>
                  </CardFooter>
                </Card>

                <Card className="hover-lift">
                  <CardHeader>
                    <CardTitle>Interactive Card</CardTitle>
                    <CardDescription>With hover effect</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      This card has a hover lift effect for better UX.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* Badges */}
            <section>
              <h2 className="text-2xl font-bold mb-4">Badges</h2>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-wrap gap-4">
                    <Badge variant="default">Default</Badge>
                    <Badge variant="secondary">Secondary</Badge>
                    <Badge variant="outline">Outline</Badge>
                    <Badge variant="destructive">Destructive</Badge>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Form Elements */}
            <section>
              <h2 className="text-2xl font-bold mb-4">Form Elements</h2>
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Input Field</label>
                    <Input placeholder="Enter text..." />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Slider</label>
                    <Slider defaultValue={[50]} max={100} step={1} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Progress Bar</label>
                    <Progress value={65} />
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Alerts */}
            <section>
              <h2 className="text-2xl font-bold mb-4">Alerts</h2>
              <div className="space-y-4">
                <Alert>
                  <h3 className="font-semibold">Default Alert</h3>
                  <p className="text-sm">This is a default alert message.</p>
                </Alert>
                <Alert variant="destructive">
                  <h3 className="font-semibold">Error Alert</h3>
                  <p className="text-sm">This is a destructive alert message.</p>
                </Alert>
              </div>
            </section>
          </TabsContent>

          {/* Typography Tab */}
          <TabsContent value="typography" className="space-y-8">
            <section>
              <h2 className="text-2xl font-bold mb-4">Typography Scale</h2>
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div>
                    <h1 className="text-4xl font-bold">Heading 1 - 4xl</h1>
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold">Heading 2 - 3xl</h2>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">Heading 3 - 2xl</h3>
                  </div>
                  <div>
                    <h4 className="text-xl font-bold">Heading 4 - xl</h4>
                  </div>
                  <div>
                    <p className="text-base">Body text - base (16px)</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Small text - sm (14px)</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Extra small - xs (12px)</p>
                  </div>
                </CardContent>
              </Card>
            </section>
          </TabsContent>

          {/* Animations Tab */}
          <TabsContent value="animations" className="space-y-8">
            <section>
              <h2 className="text-2xl font-bold mb-4">Animation Utilities</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="fade-in">
                  <CardHeader>
                    <CardTitle>Fade In</CardTitle>
                    <CardDescription>Class: fade-in</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Smooth fade in animation
                    </p>
                  </CardContent>
                </Card>

                <Card className="slide-in-bottom">
                  <CardHeader>
                    <CardTitle>Slide In Bottom</CardTitle>
                    <CardDescription>Class: slide-in-bottom</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Slides in from bottom
                    </p>
                  </CardContent>
                </Card>

                <Card className="scale-in">
                  <CardHeader>
                    <CardTitle>Scale In</CardTitle>
                    <CardDescription>Class: scale-in</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Scales up from center
                    </p>
                  </CardContent>
                </Card>

                <Card className="hover-lift">
                  <CardHeader>
                    <CardTitle>Hover Lift</CardTitle>
                    <CardDescription>Class: hover-lift</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Hover to see the effect
                    </p>
                  </CardContent>
                </Card>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Loading States</h2>
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="h-4 bg-muted rounded shimmer" />
                    <div className="h-4 bg-muted rounded shimmer w-3/4" />
                    <div className="h-4 bg-muted rounded shimmer w-1/2" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-4">
                    Class: shimmer - Animated loading placeholder
                  </p>
                </CardContent>
              </Card>
            </section>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
