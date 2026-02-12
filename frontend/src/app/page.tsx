import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Calendar, ArrowRight } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <span className="flex items-center gap-2 font-semibold">
            <Calendar className="h-6 w-6 text-primary" />
            Smart Scheduling System
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" asChild>
              <Link href="/login">Log in</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Get started</Link>
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-2xl text-center space-y-8">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Schedule smarter, not harder
          </h1>
          <p className="text-lg text-muted-foreground">
            Manage therapy appointments, availability, and sessions in one place.
            For admins, therapists, and clients.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button size="lg" asChild>
              <Link href="/register" className="inline-flex items-center gap-2">
                Create account
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/login">Log in</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
