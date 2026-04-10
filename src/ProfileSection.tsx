import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera, Check, Trash2, ArrowUp, ArrowDown,
  Globe, MapPin, Lock, Edit2, LinkIcon, Plus, Loader2, UploadCloud
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from "./dialog";
import { Input } from "./input";
import { Label } from "./label";
import { Textarea } from "./textarea";
import { Button } from "./button";
import { useAuth } from "./AuthContext";

type School = { id: number; name: string; short_name: string; type: string; region: string; logo: string; };
type SocialLink = { id: string; platform: string; url: string };

const FALLBACK_SCHOOL: School = {
  id: 0,
  name: "University of Technology",
  short_name: "UoT",
  type: "University",
  region: "",
  logo: "",
};

const FALLBACK_SOCIALS: SocialLink[] = [
  { id: "1", platform: "github", url: "https://github.com/alex" },
  { id: "2", platform: "linkedin", url: "https://linkedin.com/in/alex" },
];

const FALLBACK_PROFILE = {
  displayName: "Alex Student",
  pronouns: "they/them",
  school: FALLBACK_SCHOOL,
  bio: "Computer Science major passionate about AI, design systems, and making education more accessible.",
  avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex",
  socials: FALLBACK_SOCIALS,
};

const EMPTY_PROFILE = {
  displayName: "",
  pronouns: "",
  school: FALLBACK_SCHOOL,
  bio: "",
  avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=User",
  socials: [],
};

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "SC";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

const getUiAvatarUrl = (seed: string) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(seed)}&background=EEF2FF&color=4F46E5&size=128&format=png&bold=true`;

const SOCIAL_PLATFORMS = [
  { id: "github", label: "GitHub", svg: <path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>, color: "text-[#181717]" },
  { id: "linkedin", label: "LinkedIn", svg: <path fill="currentColor" d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>, color: "text-[#0A66C2]" },
  { id: "twitter", label: "Twitter", svg: <path fill="currentColor" d="M12.6.75h2.454l-5.36 6.142L16 15.25h-4.937l-3.867-5.07-4.425 5.07H.316l5.733-6.57L0 .75h5.063l3.495 4.633L12.601.75Zm-.86 13.028h1.36L4.323 2.145H2.865l8.875 11.633Z"/>, color: "text-black" },
  { id: "instagram", label: "Instagram", svg: <path fill="currentColor" d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558a5.898 5.898 0 0 0 2.126-1.384 5.86 5.86 0 0 0 1.384-2.126c.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913a5.89 5.89 0 0 0-1.384-2.126A5.847 5.847 0 0 0 19.858.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.757 6.162 6.162 6.162 3.405 0 6.162-2.757 6.162-6.162 0-3.405-2.757-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.441 1.44-.795 0-1.439-.645-1.439-1.44 0-.795.644-1.439 1.439-1.439.795 0 1.441.644 1.441 1.439z"/>, color: "text-[#E4405F]" }
];

const SchoolLogo = ({
  src,
  alt,
  className,
  shortName,
  fullName,
}: {
  src?: string;
  alt: string;
  className: string;
  shortName?: string;
  fullName?: string;
}) => {
  const fallbackSeed = shortName?.trim() || getInitials(fullName || alt);
  const fallbackSrc = getUiAvatarUrl(fallbackSeed);
  const [imgSrc, setImgSrc] = useState(src || fallbackSrc);
  const [isFallback, setIsFallback] = useState(!src);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setImgSrc(src || fallbackSrc);
    setIsFallback(!src);
    setIsLoading(true);
  }, [src, fallbackSrc]);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 animate-pulse bg-slate-200/70" aria-hidden="true" />
      )}
      <img
        src={imgSrc}
        alt={alt}
        className={`h-full w-full transition-opacity duration-200 ${isLoading ? "opacity-0" : "opacity-100"} ${isFallback ? "object-cover" : "object-contain"}`}
        crossOrigin="anonymous"
        referrerPolicy="no-referrer"
        onLoad={() => setIsLoading(false)}
        onError={() => {
          if (!isFallback) {
            setImgSrc(fallbackSrc);
            setIsFallback(true);
            setIsLoading(true);
            return;
          }
          setIsLoading(false);
        }}
      />
    </div>
  );
};

export function ProfileSection() {
  const { profile: authProfile, updateProfile, refreshProfile } = useAuth();
  const [isPrivate, setIsPrivate] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState(EMPTY_PROFILE);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isHoveringAvatar, setIsHoveringAvatar] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [schools, setSchools] = useState<School[]>([]);
  const [schoolSearch, setSchoolSearch] = useState("");
  const [debouncedSchoolSearch, setDebouncedSchoolSearch] = useState("");
  const [manualSchoolName, setManualSchoolName] = useState("");
  const [isSchoolBoxOpen, setIsSchoolBoxOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const [isSocialSelectOpen, setIsSocialSelectOpen] = useState(false);
  const [avatarLoaded, setAvatarLoaded] = useState(false);

  const currentProfile = useMemo(() => {
    const school = {
      id: authProfile?.school_id ?? FALLBACK_SCHOOL.id,
      name: authProfile?.school_name ?? FALLBACK_SCHOOL.name,
      short_name: authProfile?.school_short_name ?? FALLBACK_SCHOOL.short_name,
      type: authProfile?.school_type ?? FALLBACK_SCHOOL.type,
      region: authProfile?.school_region ?? FALLBACK_SCHOOL.region,
      logo: authProfile?.school_logo ?? FALLBACK_SCHOOL.logo,
    };

    return {
      displayName: authProfile?.display_name ?? FALLBACK_PROFILE.displayName,
      pronouns: authProfile?.pronouns ?? FALLBACK_PROFILE.pronouns,
      school,
      bio: authProfile?.bio ?? FALLBACK_PROFILE.bio,
      avatarUrl: authProfile?.avatar_url ?? FALLBACK_PROFILE.avatarUrl,
      socials: Array.isArray(authProfile?.socials) && authProfile.socials.length > 0
        ? authProfile.socials
        : FALLBACK_SOCIALS,
    };
  }, [authProfile]);

  useEffect(() => {
    import("./ph_schools.json").then((mod) => {
      setSchools(mod.default || mod);
    }).catch(err => console.error("Failed to load schools:", err));
  }, []);

  useEffect(() => {
    if (isDialogOpen) {
      // If user has no profile data yet (new user), start with empty form
      const hasProfileData = !!(
        authProfile?.display_name || 
        authProfile?.pronouns || 
        authProfile?.bio || 
        authProfile?.socials?.length
      );
      
      const formToUse = hasProfileData ? currentProfile : EMPTY_PROFILE;
      setEditForm(formToUse);
      setSchoolSearch(formToUse.school?.name || "");
      setDebouncedSchoolSearch(formToUse.school?.name || "");
      setManualSchoolName("");
    }
  }, [isDialogOpen, currentProfile, authProfile]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSchoolSearch(schoolSearch.trim());
    }, 250);

    return () => clearTimeout(timer);
  }, [schoolSearch]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSchoolBoxOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleFileProcess = (file?: File) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      toast.error("Format not supported. Please upload a JPG or PNG file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File is too large. Maximum size is 5MB.");
      return;
    }
    setIsUploading(true);
    setAvatarLoaded(false);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      setTimeout(() => {
        setIsUploading(false);
        setEditForm(prev => ({ ...prev, avatarUrl: e.target?.result as string }));
        toast.success("Profile picture updated successfully.");
      }, 600);
    };
    reader.readAsDataURL(file);
  };
  
  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileProcess(e.target.files?.[0]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileProcess(e.dataTransfer.files?.[0]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      console.log("[ProfileDebug] Saving profile with data:", {
        displayName: editForm.displayName,
        pronouns: editForm.pronouns,
        bio: editForm.bio,
        school: editForm.school,
        socialsCount: editForm.socials.length,
      });

      await updateProfile({
        display_name: editForm.displayName,
        avatar_url: editForm.avatarUrl,
        pronouns: editForm.pronouns,
        bio: editForm.bio,
        school_id: editForm.school.id > 0 ? editForm.school.id : null,
        school_name: editForm.school.name,
        school_short_name: editForm.school.short_name,
        school_type: editForm.school.type,
        school_region: editForm.school.region,
        school_logo: editForm.school.logo,
        socials: editForm.socials,
      });
      await refreshProfile();
      setIsDialogOpen(false);
      toast.success("Profile updated successfully!");
    } catch (error) {
      console.error("[ProfileDebug] Profile save failed:", error);
      toast.error(`Failed to save profile: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredSchools = useMemo(() => {
    const query = debouncedSchoolSearch.toLowerCase();
    if (!query) return schools.slice(0, 10);

    return schools
      .filter(s =>
        s.name.toLowerCase().includes(query) ||
        s.short_name.toLowerCase().includes(query)
      )
      .slice(0, 10);
  }, [schools, debouncedSchoolSearch]);

  const addSocial = (platformId: string) => {
    const newId = Math.random().toString(36).substr(2, 9);
    setEditForm(prev => ({
      ...prev,
      socials: [...prev.socials, { id: newId, platform: platformId, url: "" }]
    }));
    setIsSocialSelectOpen(false);
  };

  const updateSocialUrl = (id: string, url: string) => {
    setEditForm(prev => ({
      ...prev,
      socials: prev.socials.map(s => s.id === id ? { ...s, url } : s)
    }));
  };

  const removeSocial = (id: string) => {
    setEditForm(prev => ({
      ...prev,
      socials: prev.socials.filter(s => s.id !== id)
    }));
  };

  const moveSocial = (index: number, direction: "up" | "down") => {
    const newSocials = [...editForm.socials];
    if (direction === "up" && index > 0) {
      [newSocials[index - 1], newSocials[index]] = [newSocials[index], newSocials[index - 1]];
    } else if (direction === "down" && index < newSocials.length - 1) {
      [newSocials[index + 1], newSocials[index]] = [newSocials[index], newSocials[index + 1]];
    }
    setEditForm(prev => ({...prev, socials: newSocials}));
  };

  return (
    <div className="flex flex-col bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6 w-full h-fit min-h-max gap-5">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100/80">
        <h2 className="text-xl font-bold tracking-tight text-slate-800">My Profile</h2>
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
            {isPrivate ? "PRIVATE" : "PUBLIC"}
          </span>
          <button
            onClick={() => setIsPrivate(!isPrivate)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${isPrivate ? "bg-slate-300" : "bg-indigo-600"}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 shadow-sm ${isPrivate ? "translate-x-1" : "translate-x-6"}`} />
          </button>
        </div>
      </div>

      {/* Main Profile Info */}
      <div className="flex flex-row items-center sm:items-start gap-5">
        <div className="relative shrink-0 group">
          <div className={`w-[90px] h-[90px] sm:w-[100px] sm:h-[100px] rounded-full overflow-hidden border-4 border-white shadow-sm bg-indigo-50 transition-all duration-300 ${isPrivate ? 'opacity-80 saturate-50' : ''}`}>
            <img 
              src={currentProfile.avatarUrl} 
              alt={currentProfile.displayName}
              onLoad={() => setAvatarLoaded(true)}
              className={`w-full h-full object-cover transition-opacity duration-500 ${avatarLoaded ? 'opacity-100' : 'opacity-0'}`} 
            />
            {!avatarLoaded && (
              <div className="absolute inset-0 flex items-center justify-center text-indigo-300">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            )}
          </div>
        </div>
        
        <div className="flex flex-col pt-1">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mb-1.5">
            <h3 className="text-2xl font-bold text-slate-800 tracking-tight">{currentProfile.displayName}</h3>
            <AnimatePresence mode="popLayout">
              {!isPrivate && currentProfile.pronouns && (
                <motion.span 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95, width: 0, margin: 0, padding: 0 }}
                  className="px-2.5 py-0.5 bg-slate-100 text-slate-600 text-xs font-semibold rounded-full overflow-hidden whitespace-nowrap self-start sm:self-auto"
                >
                  {currentProfile.pronouns}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-indigo-600 font-semibold mb-2.5">
            <SchoolLogo
              src={currentProfile.school.logo}
              alt={currentProfile.school.name}
              shortName={currentProfile.school.short_name}
              fullName={currentProfile.school.name}
              className="w-4 h-4 rounded"
            />
            <span>{currentProfile.school.name}</span>
            <span className="text-slate-400">&bull;</span>
            <span className="text-slate-500 font-medium">{currentProfile.school.type}</span>
          </div>
          <p className="text-sm text-slate-600 leading-snug max-w-[90%] sm:max-w-md line-clamp-2">
            {currentProfile.bio}
          </p>
        </div>
      </div>

      {/* Digital Footprint */}
      <AnimatePresence mode="popLayout">
        {!isPrivate ? (
          currentProfile.socials.length > 0 && (
            <motion.div 
              key="footprint"
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: "auto", marginTop: 8 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              transition={{ duration: 0.2 }}
              className="border-t border-slate-100/80 pt-4 overflow-hidden"
            >
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Digital Footprint</h4>
              <div className="flex flex-row flex-wrap gap-2.5">
                {currentProfile.socials.map(social => {
                  const platformInfo = SOCIAL_PLATFORMS.find(p => p.id === social.platform) || { id: "web", label: "Website", svg: <Globe size={16} />, color: "text-slate-600" };
                  const displayUrl = social.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
                  
                  return (
                    <a
                      key={social.id}
                      href={social.url.startsWith('http') ? social.url : `https://${social.url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-full transition-all duration-200 group shadow-sm hover:shadow"
                    >
                      <svg viewBox="0 0 24 24" width="16" height="16" className={`${platformInfo.color} group-hover:scale-110 transition-transform duration-200`}>
                        {platformInfo.svg}
                      </svg>
                      <span className="text-sm font-medium text-slate-700 truncate max-w-[120px]">{platformInfo.label}</span>
                    </a>
                  );
                })}
              </div>
            </motion.div>
          )
        ) : (
          <motion.div 
            key="private-indicator"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-slate-100/80 pt-4 pb-1"
          >
            <div className="flex items-center gap-2 text-slate-400 bg-slate-50 border border-slate-100 px-3 py-2 rounded-xl text-sm font-medium w-fit">
              <Lock className="w-4 h-4" />
              Private Profile Active
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer Details */}
      <div className="border-t border-slate-100/80 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-emerald-50 border border-emerald-100/50 flex items-center justify-center shrink-0">
            <Check className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-slate-800">Profile Completion</span>
            <span className="text-xs font-medium text-emerald-600 flex items-center gap-1.5">
              85% <span className="text-slate-400 font-normal">&bull; Last updated today</span>
            </span>
          </div>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto bg-indigo-50/50 hover:bg-indigo-50 text-indigo-700 font-semibold rounded-xl h-10 px-6 shadow-sm border border-indigo-100/60 transition-all hover:scale-[1.02]">
              <Edit2 className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          </DialogTrigger>
          
          <DialogContent className="max-w-[700px] h-[85vh] p-0 gap-0 overflow-y-auto rounded-[2rem] bg-white flex flex-col shadow-2xl border border-slate-200">
            <DialogTitle className="sr-only">Edit Profile</DialogTitle>
            <DialogDescription className="sr-only">Edit your profile information including name, pronouns, school, bio, and social links</DialogDescription>
            
            <div className="relative h-32 bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 shrink-0">
               <div className="absolute inset-0 bg-black/5 backdrop-blur-[1px]"></div>
            </div>
            
            <div className="px-6 sm:px-10 pb-20 pt-0 w-full max-w-2xl mx-auto flex-1 flex flex-col">
              
              {/* Interactive Profile Picture Setup */}
              <div className="relative -mt-16 mb-8 flex justify-center">
                <input type="file" ref={fileInputRef} className="hidden" accept="image/jpeg, image/png" onChange={handleAvatarUpload} />
                
                <div 
                  className={`group relative w-[120px] h-[120px] rounded-full overflow-hidden shadow-lg border-[4px] border-white bg-slate-100 cursor-pointer flex-shrink-0 transition-all duration-300 ${isDragOver ? "scale-105 ring-4 ring-indigo-200" : "hover:scale-[1.03]"} active:scale-95`}
                  onClick={() => !isUploading && fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onMouseEnter={() => setIsHoveringAvatar(true)}
                  onMouseLeave={() => setIsHoveringAvatar(false)}
                >
                  <img 
                    src={editForm.avatarUrl} 
                    alt="Current Avatar" 
                    className={`w-full h-full object-cover transition-opacity duration-300 ${(isUploading || isHoveringAvatar || isDragOver) ? 'opacity-30' : 'opacity-100'}`} 
                  />
                  
                  <div className={`absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-300 ${(isHoveringAvatar || isDragOver) && !isUploading ? 'opacity-100' : 'opacity-0'}`}>
                    <div className="bg-slate-900/60 rounded-full p-2 mb-1.5 backdrop-blur-sm">
                      {isDragOver ? <UploadCloud className="w-5 h-5 text-white" /> : <Camera className="w-5 h-5 text-white" />}
                    </div>
                    <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wider drop-shadow-sm">
                      {isDragOver ? "Drop Image" : "Change"}
                    </span>
                  </div>

                  {isUploading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-8">
                {/* Personal Info */}
                <section className="space-y-4">
                  <div className="border-b border-slate-100 pb-2">
                    <h2 className="text-lg font-bold tracking-tight text-slate-800">Personal Details</h2>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-slate-600 font-semibold text-xs tracking-wide">FULL NAME</Label>
                      <Input 
                        value={editForm.displayName} 
                        onChange={e => setEditForm({...editForm, displayName: e.target.value})} 
                        className="h-11 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all font-medium text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-slate-600 font-semibold text-xs tracking-wide">PRONOUNS</Label>
                      <Input 
                        value={editForm.pronouns} 
                        onChange={e => setEditForm({...editForm, pronouns: e.target.value})} 
                        className="h-11 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all font-medium text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 relative" ref={searchRef}>
                    <Label className="text-slate-600 font-semibold text-xs tracking-wide">UNIVERSITY OR SCHOOL</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input 
                        value={schoolSearch}
                        onChange={e => {
                          setSchoolSearch(e.target.value);
                          setIsSchoolBoxOpen(true);
                        }}
                        onFocus={() => setIsSchoolBoxOpen(true)}
                        className="h-11 pl-10 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all font-medium text-sm"
                        placeholder="Search universities..."
                      />
                    </div>
                    
                    <AnimatePresence mode="popLayout">
                    {isSchoolBoxOpen && schoolSearch && (
                      <motion.div 
                        initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.15 }}
                        className="absolute z-50 w-full mt-1 bg-white rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] border border-slate-100 max-h-56 overflow-y-auto"
                      >
                        {filteredSchools.length > 0 ? (
                          <div className="p-1.5 space-y-0.5">
                            {filteredSchools.map(school => (
                              <button
                                key={school.id}
                                onClick={() => {
                                  setEditForm({...editForm, school});
                                  setSchoolSearch(school.name);
                                  setManualSchoolName("");
                                  setIsSchoolBoxOpen(false);
                                }}
                                className="w-full flex items-center gap-3 p-2.5 hover:bg-slate-50 rounded-lg text-left transition-colors"
                              >
                                <SchoolLogo
                                  src={school.logo}
                                  alt={school.name}
                                  shortName={school.short_name}
                                  fullName={school.name}
                                  className="w-8 h-8 rounded bg-white border border-slate-100"
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-bold text-slate-800 truncate">{school.name}</p>
                                  <div className="flex gap-2 items-center text-[11px] text-slate-500">
                                    <span className="font-semibold text-indigo-600">{school.short_name}</span>
                                    <span>&bull;</span>
                                    <span>{school.type}</span>
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="p-4 text-center text-sm text-slate-500 font-medium">
                            No schools found.
                          </div>
                        )}
                      </motion.div>
                    )}
                    </AnimatePresence>

                    <div className="mt-2.5 rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-3">
                      <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Not listed? Add manually</Label>
                      <Input
                        value={manualSchoolName}
                        onChange={e => {
                          const value = e.target.value;
                          setManualSchoolName(value);

                          if (!value.trim()) {
                            setSchoolSearch("");
                            return;
                          }

                          setSchoolSearch(value);
                          setEditForm(prev => ({
                            ...prev,
                            school: {
                              id: -1,
                              name: value,
                              short_name: getInitials(value),
                              type: "Custom School",
                              region: "",
                              logo: "",
                            },
                          }));
                        }}
                        className="mt-2 h-10 rounded-lg bg-white border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 text-sm"
                        placeholder="Enter school name manually"
                      />
                    </div>

                    <div className="mt-2 flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2.5">
                      <SchoolLogo
                        src={editForm.school.logo}
                        alt={editForm.school.name}
                        shortName={editForm.school.short_name}
                        fullName={editForm.school.name}
                        className="w-7 h-7 rounded border border-slate-100 bg-white"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{editForm.school.name}</p>
                        <p className="text-xs text-slate-500 truncate">{editForm.school.type}</p>
                      </div>
                    </div>
                  </div>
                </section>

                {/* About Me */}
                <section className="space-y-3">
                  <div className="border-b border-slate-100 pb-2">
                    <h2 className="text-lg font-bold tracking-tight text-slate-800">Bio</h2>
                  </div>
                  <div className="space-y-1.5">
                    <Textarea 
                      value={editForm.bio}
                      onChange={e => {
                        if(e.target.value.length <= 280) {
                          setEditForm({...editForm, bio: e.target.value});
                        }
                      }}
                      className="min-h-[100px] rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all resize-none font-medium leading-relaxed text-sm p-3.5"
                    />
                    <div className="flex justify-end">
                      <span className={`text-[11px] font-bold ${editForm.bio.length >= 280 ? 'text-red-500' : 'text-slate-400'}`}>
                        {editForm.bio.length} / 280
                      </span>
                    </div>
                  </div>
                </section>

                {/* Digital Footprint */}
                <section className="space-y-3 flex flex-col pb-4">
                  <div className="border-b border-slate-100 pb-2 flex justify-between items-end">
                    <h2 className="text-lg font-bold tracking-tight text-slate-800">Digital Footprint</h2>
                    
                    <div className="relative">
                      <Button 
                        variant="outline" size="sm" onClick={() => setIsSocialSelectOpen(!isSocialSelectOpen)}
                        className="rounded-full h-8 px-3.5 font-semibold border-slate-200 shadow-sm hover:bg-slate-50 text-indigo-600 text-xs"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" /> Add Platform
                      </Button>
                      
                      <AnimatePresence mode="popLayout">
                      {isSocialSelectOpen && (
                        <motion.div 
                          initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                          className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-10 py-1.5"
                        >
                          {SOCIAL_PLATFORMS.map(platform => {
                            const isAdded = editForm.socials.some(s => s.platform === platform.id);
                            if (isAdded) return null;
                            return (
                              <button
                                key={platform.id}
                                onClick={() => addSocial(platform.id)}
                                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 text-left text-sm font-semibold text-slate-700 transition-colors"
                              >
                                <svg viewBox="0 0 24 24" width="16" height="16" className={platform.color}>
                                  {platform.svg}
                                </svg>
                                {platform.label}
                              </button>
                            );
                          })}
                        </motion.div>
                      )}
                      </AnimatePresence>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <AnimatePresence mode="popLayout">
                      {editForm.socials.map((social, index) => {
                        const platformInfo = SOCIAL_PLATFORMS.find(p => p.id === social.platform) || { id: "web", label: "Website", svg: <Globe size={16} />, color: "text-slate-600" };
                        
                        return (
                          <motion.div
                            key={social.id}
                            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                            className="flex flex-row items-center gap-3 p-2 bg-slate-50 rounded-xl border border-slate-200 group"
                          >
                            <div className="flex flex-col gap-0 shrink-0">
                              <button onClick={() => moveSocial(index, "up")} disabled={index === 0} className="text-slate-300 hover:text-slate-700 disabled:opacity-0 p-0.5 transition-colors">
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => moveSocial(index, "down")} disabled={index === editForm.socials.length - 1} className="text-slate-300 hover:text-slate-700 disabled:opacity-0 p-0.5 transition-colors">
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            
                            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm border border-slate-100 shrink-0">
                              <svg viewBox="0 0 24 24" width="14" height="14" className={platformInfo.color}>
                                {platformInfo.svg}
                              </svg>
                            </div>
                            
                            <Input 
                              value={social.url}
                              onChange={e => updateSocialUrl(social.id, e.target.value)}
                              placeholder={`https://${platformInfo.id}.com/username`}
                              className="h-10 rounded-lg bg-white border-transparent focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 flex-1 font-medium text-sm shadow-sm"
                            />
                            <Button 
                              variant="ghost" size="icon" onClick={() => removeSocial(social.id)}
                              className="h-9 w-9 text-slate-400 hover:text-red-500 hover:bg-red-50 shrink-0 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                    
                    {editForm.socials.length === 0 && (
                      <div className="text-center py-6 bg-slate-50 border border-slate-200 border-dashed rounded-xl">
                        <LinkIcon className="w-5 h-5 text-slate-300 mx-auto mb-1.5" />
                        <p className="text-xs font-bold text-slate-500">No links added.</p>
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </div>
            
            <div className="sticky bottom-0 right-0 w-full bg-white/95 backdrop-blur-md border-t border-slate-100 p-4 sm:px-10 py-4 flex justify-end gap-3 z-50 shadow-[0_-10px_20px_rgba(0,0,0,0.03)] rounded-b-[2rem]">
              <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="rounded-xl font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-800 h-11 px-6">
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving} className="rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20 h-11 px-8 transition-transform hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed">
                {isSaving ? "Saving..." : "Save Profile"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}