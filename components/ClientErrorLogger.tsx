"use client";

import { useEffect } from "react";

function sendErrorToServer(payload: any) {
    // Hit a Next.js API route
    fetch("/api/client-error-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    }).catch(() => {
        // swallow – we don't want logging failures to break the app
    });
}

export default function ClientErrorLogger() {
    useEffect(() => {
        const handleError = (event: ErrorEvent) => {
            sendErrorToServer({
                type: "error",
                message: event.message,
                stack: event.error?.stack ?? null,
                file: event.filename,
                line: event.lineno,
                col: event.colno,
                url: window.location.href,
                userAgent: navigator.userAgent,
                timestamp: Date.now(),
            });
        };

        const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
            sendErrorToServer({
                type: "unhandledrejection",
                reason: event.reason?.message ?? String(event.reason),
                stack: event.reason?.stack ?? null,
                url: window.location.href,
                userAgent: navigator.userAgent,
                timestamp: Date.now(),
            });
        };

        window.addEventListener("error", handleError);
        window.addEventListener("unhandledrejection", handleUnhandledRejection);

        return () => {
            window.removeEventListener("error", handleError);
            window.removeEventListener("unhandledrejection", handleUnhandledRejection);
        };
    }, []);

    return null; // this component only sets up listeners
}
