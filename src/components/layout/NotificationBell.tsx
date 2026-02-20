"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, Check, Trash2, ChevronRight } from "lucide-react";
import { collection, query, where, orderBy, onSnapshot, writeBatch, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { Notification } from "@/lib/types";
import { markNotificationRead, markAllNotificationsRead } from "@/lib/firestore";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

export default function NotificationBell() {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!user) return;

        const q = query(
            collection(db, "notifications"),
            where("recipientId", "==", user.uid),
            orderBy("createdAt", "desc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
            setNotifications(notifs);
        });

        return () => unsubscribe();
    }, [user]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const unreadCount = notifications.filter(n => !n.read).length;

    const handleMarkAllRead = async () => {
        if (!user) return;
        await markAllNotificationsRead(user.uid);
    };

    const handleNotificationClick = async (notif: Notification) => {
        if (!notif.read) {
            await markNotificationRead(notif.id);
        }
        setIsOpen(false);
    };

    if (!user) return null;

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-slate-500 hover:text-sky-600 transition-colors rounded-full hover:bg-slate-100"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white animate-in zoom-in">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white shadow-xl ring-1 ring-slate-200 focus:outline-none z-50 overflow-hidden animate-in slide-in-from-top-2">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                        <h3 className="font-semibold text-slate-900">Notifications</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllRead}
                                className="text-xs font-medium text-sky-600 hover:text-sky-700 flex items-center gap-1 transition-colors"
                            >
                                <Check size={14} />
                                Mark all as read
                            </button>
                        )}
                    </div>

                    <div className="max-h-[400px] overflow-y-auto w-full">
                        {notifications.length === 0 ? (
                            <div className="px-4 py-8 text-center text-slate-500 text-sm">
                                <Bell className="mx-auto size-8 opacity-20 mb-2" />
                                No notifications yet
                            </div>
                        ) : (
                            <ul className="divide-y divide-slate-100">
                                {notifications.map(notif => (
                                    <li key={notif.id} className={`transition-colors hover:bg-slate-50 ${notif.read ? 'opacity-70' : 'bg-sky-50/30'}`}>
                                        <Link
                                            href={`/studio/${notif.studioId}${notif.projectId ? `/projects/${notif.projectId}` : ''}`}
                                            onClick={() => handleNotificationClick(notif)}
                                            className="px-4 py-3 flex gap-3 text-left w-full items-start group"
                                        >
                                            <div className="mt-1 flex-shrink-0">
                                                {notif.type === "pending_approval" ? (
                                                    <div className="size-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
                                                        <Check size={16} />
                                                    </div>
                                                ) : (
                                                    <div className="size-8 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center">
                                                        <Bell size={16} />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm ${notif.read ? 'text-slate-700' : 'text-slate-900 font-semibold'}`}>
                                                    {notif.title}
                                                </p>
                                                {notif.body && (
                                                    <p className="text-xs text-slate-500 truncate mt-0.5">
                                                        {notif.body}
                                                    </p>
                                                )}
                                                <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider font-medium">
                                                    {formatDistanceToNow(notif.createdAt, { addSuffix: true })}
                                                </p>
                                            </div>
                                            <div className="pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <ChevronRight size={16} className="text-slate-400" />
                                            </div>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
