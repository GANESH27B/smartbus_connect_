"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Loader2, LogOut, MapPin, Calendar, Clock, User as UserIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Separator } from "@/components/ui/separator";

import { useLanguage, Language } from "@/context/LanguageContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TripHistoryItem {
    _id: string;
    origin: string;
    destination: string;
    date: string;
    description?: string;
    plan: {
        totalTime: string;
        estimatedCost?: string;
        summary: string;
    };
}

export default function ProfilePage() {
    const { user, loading, signOut } = useAuth();
    const { t, language, setLanguage } = useLanguage();
    const router = useRouter();
    const [trips, setTrips] = useState<TripHistoryItem[]>([]);
    const [loadingTrips, setLoadingTrips] = useState(true);

    useEffect(() => {
        if (!loading && !user) {
            router.push("/login"); // Redirect if not logged in
        }
    }, [user, loading, router]);

    useEffect(() => {
        if (user) {
            fetchTrips();
        }
    }, [user]);

    const fetchTrips = async () => {
        try {
            const res = await fetch('/api/user/trips');
            const data = await res.json();
            if (data.success) {
                setTrips(data.data);
            }
        } catch (error) {
            console.error("Failed to fetch trips", error);
        } finally {
            setLoadingTrips(false);
        }
    };

    if (loading || !user) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    // Get initials for avatar fallback
    const initials = user.displayName
        ? user.displayName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
        : "U";

    const languages = [
        { code: 'en', name: 'English' },
        { code: 'hi', name: 'हिन्दी (Hindi)' },
        { code: 'ta', name: 'தமிழ் (Tamil)' },
        { code: 'te', name: 'తెలుగు (Telugu)' },
        { code: 'kn', name: 'ಕನ್ನಡ (Kannada)' },
        { code: 'ml', name: 'മലയാളം (Malayalam)' },
        { code: 'mr', name: 'मराठी (Marathi)' },
        { code: 'bn', name: 'বাংলা (Bengali)' },
        { code: 'gu', name: 'ગુજરાતી (Gujarati)' },
        { code: 'pa', name: 'ਪੰਜਾਬੀ (Punjabi)' },
    ];

    return (
        <div className="container mx-auto py-12 px-4 md:px-6 max-w-6xl">
            {/* Vibrant User Band */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-[2rem] p-8 md:p-12 mb-12 shadow-2xl"
            >
                <div className="absolute inset-0 bg-vibrant-gradient opacity-90 z-0"></div>
                <div className="absolute top-[-50%] right-[-10%] w-[400px] h-[400px] bg-white/20 blur-[100px] rounded-full animate-blob"></div>

                <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                    <Avatar className="h-28 w-28 border-4 border-white/50 shadow-xl">
                        <AvatarImage src={user.photoURL || ""} alt={user.displayName || "User"} />
                        <AvatarFallback className="text-3xl font-bold bg-white text-primary">{initials}</AvatarFallback>
                    </Avatar>

                    <div className="text-center md:text-left space-y-2">
                        <h1 className="text-4xl md:text-5xl font-black text-white font-headline tracking-tight italic">
                            {user.displayName || "User"}
                        </h1>
                        <p className="text-white/80 text-lg font-medium">{user.email}</p>
                        <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-4">
                            <Badge className="bg-white/20 hover:bg-white/30 text-white border-white/20 backdrop-blur-md px-4 py-1.5 rounded-full">
                                {t('profile_standard_member')}
                            </Badge>
                            <Badge className="bg-emerald-500/20 text-emerald-100 border-emerald-500/30 backdrop-blur-md px-4 py-1.5 rounded-full flex items-center gap-2">
                                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                                Active Now
                            </Badge>
                        </div>
                    </div>
                </div>
            </motion.div>

            <div className="grid gap-8 md:grid-cols-3">
                {/* Profile Settings Card */}
                <div className="md:col-span-1">
                    <Card className="rounded-[2rem] border-none shadow-xl bg-card/40 backdrop-blur-xl overflow-hidden">
                        <div className="h-2 bg-vibrant-gradient"></div>
                        <CardHeader>
                            <CardTitle className="text-2xl font-bold">{t('profile_language')}</CardTitle>
                            <CardDescription>Select your native language for better accessibility.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3">
                                <Select value={language} onValueChange={(val) => setLanguage(val as Language)}>
                                    <SelectTrigger className="w-full h-12 rounded-xl border-primary/20 bg-background/50">
                                        <SelectValue placeholder="Select Language" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        {languages.map((lang) => (
                                            <SelectItem key={lang.code} value={lang.code} className="cursor-pointer">
                                                {lang.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <Separator />

                            <div className="bg-muted/50 p-4 rounded-2xl flex items-center gap-3">
                                <div className="bg-primary/20 p-2 rounded-xl">
                                    <UserIcon className="h-5 w-5 text-primary" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">{t('profile_account_type')}</p>
                                    <p className="text-sm font-bold">{t('profile_standard_member')}</p>
                                </div>
                            </div>

                            <Button
                                variant="destructive"
                                className="w-full h-12 rounded-xl gap-2 font-bold shadow-lg shadow-rose-500/20 hover:scale-[1.02] transition-transform"
                                onClick={() => {
                                    signOut();
                                    router.push("/");
                                }}
                            >
                                <LogOut className="h-4 w-4" />
                                {t('profile_sign_out')}
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {/* Trip History Section */}
                <div className="md:col-span-2 space-y-6">
                    <div>
                        <h2 className="text-3xl font-black font-headline mb-2 italic">{t('profile_trips')}</h2>
                        <p className="text-muted-foreground">{language === 'en' ? 'View your recent AI-planned journeys.' : t('profile_trips_desc') || 'View your recent AI-planned journeys.'}</p>
                    </div>

                    {loadingTrips ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : trips.length > 0 ? (
                        <div className="grid gap-4">
                            {trips.map((trip) => (
                                <Card key={trip._id} className="hover:shadow-md transition-shadow">
                                    <CardContent className="p-6">
                                        <div className="flex flex-col md:flex-row justify-between gap-4 mb-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2 text-primary font-bold">
                                                    <MapPin className="h-4 w-4" />
                                                    <span>{trip.origin}</span>
                                                    <span className="text-muted-foreground">→</span>
                                                    <span>{trip.destination}</span>
                                                </div>
                                                <p className="text-sm text-muted-foreground line-clamp-2">
                                                    {trip.plan.summary}
                                                </p>
                                            </div>
                                            <div className="flex flex-row md:flex-col gap-2 md:items-end">
                                                <Badge variant="secondary" className="gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    {trip.plan.totalTime}
                                                </Badge>
                                                {trip.plan.estimatedCost && (
                                                    <Badge variant="outline" className="gap-1 border-emerald-500/30 text-emerald-600 bg-emerald-500/5">
                                                        {trip.plan.estimatedCost}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                        <div className="pt-4 border-t flex items-center justify-between text-xs text-muted-foreground">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="h-3 w-3" />
                                                {new Date(trip.date).toLocaleDateString(undefined, {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </div>
                                            {/* Could add a 'View Details' button here linking back to planner with pre-filled state */}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <Card>
                            <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                                <div className="bg-muted p-4 rounded-full mb-4">
                                    <MapPin className="h-8 w-8 text-muted-foreground/50" />
                                </div>
                                <h3 className="text-lg font-semibold mb-1">{t('profile_no_trips')}</h3>
                                <p className="mb-6">{t('profile_no_trips_desc') || "You haven't planned any trips yet."}</p>
                                <Button onClick={() => router.push("/trip-planner")}>{t('profile_plan_trip')}</Button>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
