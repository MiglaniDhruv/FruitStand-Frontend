import AppLayout from "@/components/layout/app-layout";
import WhatsAppMessageLog from "@/components/whatsapp/whatsapp-message-log";
import { MessageSquare } from "lucide-react";

export default function WhatsAppLogsPage() {
  return (
    <AppLayout>
      <div className="flex-1 flex flex-col">
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <MessageSquare className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-lg sm:text-xl font-semibold">WhatsApp Message Logs</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                View and track all WhatsApp messages sent from your organization
              </p>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 sm:p-6">
          <WhatsAppMessageLog />
        </main>
      </div>
    </AppLayout>);}