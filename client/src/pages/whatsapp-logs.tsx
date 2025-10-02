import Sidebar from "@/components/layout/sidebar";
import WhatsAppMessageLog from "@/components/whatsapp/whatsapp-message-log";
import { MessageSquare } from "lucide-react";

export default function WhatsAppLogsPage() {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <MessageSquare className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-xl font-semibold">WhatsApp Message Logs</h1>
              <p className="text-sm text-muted-foreground">
                View and track all WhatsApp messages sent from your organization
              </p>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">
          <WhatsAppMessageLog />
        </main>
      </div>
    </div>
  );
}