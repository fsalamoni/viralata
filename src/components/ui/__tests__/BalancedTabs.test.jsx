/**
 * @fileoverview Tests for BalancedTabs (TASK-402).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContentStack, BalancedTabsContent } from '@/components/ui/BalancedTabs.jsx';

describe('BalancedTabs (TASK-402)', () => {
  let container, root;
  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  it('exports tudo', () => {
    expect(Tabs).toBeTruthy();
    expect(TabsList).toBeTruthy();
    expect(TabsTrigger).toBeTruthy();
    expect(TabsContentStack).toBeTruthy();
    expect(BalancedTabsContent).toBeTruthy();
  });

  it('TabsContentStack aplica grid stacking', () => {
    act(() => {
      root.render(
        <Tabs defaultValue="a">
          <TabsContentStack>
            <BalancedTabsContent value="a">Content A</BalancedTabsContent>
            <BalancedTabsContent value="b">Content B</BalancedTabsContent>
          </TabsContentStack>
        </Tabs>
      );
    });
    const stack = container.querySelector('[data-testid="tabs-content-stack"]');
    expect(stack).toBeTruthy();
    expect(stack?.className).toContain('grid');
  });

  it('renderiza sem crash (smoke)', () => {
    let err = null;
    try {
      act(() => {
        root.render(
          <Tabs defaultValue="a">
            <TabsList>
              <TabsTrigger value="a">A</TabsTrigger>
              <TabsTrigger value="b">B</TabsTrigger>
            </TabsList>
            <TabsContentStack>
              <BalancedTabsContent value="a">A</BalancedTabsContent>
              <BalancedTabsContent value="b">B</BalancedTabsContent>
            </TabsContentStack>
          </Tabs>
        );
      });
    } catch (e) {
      err = e;
    }
    expect(err).toBe(null);
  });
});
