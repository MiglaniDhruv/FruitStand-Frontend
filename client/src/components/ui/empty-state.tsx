import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon, SearchX } from "lucide-react";

export interface EmptyStateAction {
  label: string;
  onClick: () => void;
}

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  illustration?: 'default' | 'search' | 'error';
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  illustration = 'default'
}: EmptyStateProps) {
  const getIconColor = () => {
    switch (illustration) {
      case 'search':
        return 'text-muted-foreground';
      case 'error':
        return 'text-destructive';
      default:
        return 'text-muted-foreground';
    }
  };

  const getBackgroundColor = () => {
    switch (illustration) {
      case 'search':
        return 'bg-muted/20';
      case 'error':
        return 'bg-destructive/10';
      default:
        return 'bg-muted/20';
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center animate-fade-in-up">
      <div 
        className={`${getBackgroundColor()} rounded-full p-6 mb-6 transition-all duration-300`}
      >
        <Icon 
          className={`h-12 w-12 ${getIconColor()}`} 
          strokeWidth={1.5}
        />
      </div>
      
      <div className="max-w-md space-y-2 mb-6">
        <h3 className="text-lg font-semibold text-foreground">
          {title}
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
      </div>

      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row gap-3">
          {action && (
            <Button 
              onClick={action.onClick}
              className="min-w-[120px]"
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button 
              variant="outline" 
              onClick={secondaryAction.onClick}
              className="min-w-[120px]"
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// Specialized empty state component for data tables
export function EmptyTableState({ 
  icon, 
  title, 
  description, 
  action 
}: Omit<EmptyStateProps, 'secondaryAction' | 'illustration'>) {
  return (
    <Card className="border-dashed">
      <CardContent className="py-16">
        <EmptyState
          icon={icon}
          title={title}
          description={description}
          action={action}
        />
      </CardContent>
    </Card>
  );
}

// Specialized empty state component for search results
export function EmptySearchState({ 
  searchTerm 
}: { 
  searchTerm?: string 
}) {
  return (
    <EmptyState
      icon={SearchX}
      title="No results found"
      description={
        searchTerm 
          ? `No results found for "${searchTerm}". Try adjusting your search terms or filters.`
          : "No results found. Try adjusting your search terms or filters."
      }
      illustration="search"
    />
  );
}