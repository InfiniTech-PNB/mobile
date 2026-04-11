import React, { useState, useEffect, memo, useCallback } from 'react';
import { 
    View, Text, ScrollView, TouchableOpacity, TextInput, 
    ActivityIndicator, Alert, Modal, FlatList, useColorScheme, Platform 
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker'; // Import the picker
import { 
    Calendar, Clock, Mail, ArrowRight, ArrowLeft, 
    Database, FileCode, Activity, Trash2, 
    CheckCircle2, ChevronDown, X, Cpu, Zap, Lock, Shield, Hash, Globe, ShieldCheck
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import API from "../../services/api";

const DEFAULT_FORM_STATE = {
    scheduleName: "",
    reportType: "Project Audit Summary",
    frequency: "Weekly",
    targetDomainId: "",
    includeSections: { assets: true, cboms: true, scanResults: true },
    time: "09:00",
    email: "admin@pnb-audit.com"
};

// --- STABLE SUB-COMPONENTS ---

const MetricSlider = memo(({ label, value, onChange, disabled, icon, isDark }) => (
    <View className="mb-5 w-[48%]">
        <View className="flex-row justify-between mb-1.5 px-1">
            <View className="flex-row items-center">
                {icon}
                <Text className="text-[8px] font-black text-slate-500 uppercase ml-1" numberOfLines={1}>{label}</Text>
            </View>
            <Text className="text-[10px] font-black text-orange-500">{value}</Text>
        </View>
        <View className="flex-row gap-0.5">
            {[...Array(11).keys()].map(i => (
                <TouchableOpacity 
                    key={i}
                    onPress={() => !disabled && onChange(i)}
                    className={`h-1.5 flex-1 rounded-full ${i <= value ? 'bg-orange-500' : (isDark ? 'bg-slate-800' : 'bg-slate-200')}`}
                />
            ))}
        </View>
    </View>
));

export default function ScheduledReportingScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const isDark = useColorScheme() === 'dark';

    const [domains, setDomains] = useState([]);
    const [formData, setFormData] = useState(DEFAULT_FORM_STATE);
    const [availableAssets, setAvailableAssets] = useState([]);
    const [selectedAssets, setSelectedAssets] = useState([]);
    const [activeSchedules, setActiveSchedules] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // UI States
    const [isDomainModalOpen, setIsDomainModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [showTimePicker, setShowTimePicker] = useState(false);

    const configFields = [
        { key: 'assetCriticality', label: 'Criticality', icon: <Shield size={10} color="#94a3b8"/> },
        { key: 'confidentialityWeight', label: 'Confidentiality', icon: <Lock size={10} color="#94a3b8"/> },
        { key: 'integrityWeight', label: 'Integrity', icon: <Activity size={10} color="#94a3b8"/> },
        { key: 'availabilityWeight', label: 'Availability', icon: <Zap size={10} color="#94a3b8"/> },
        { key: 'slaRequirement', label: 'SLA Priority', icon: <Cpu size={10} color="#94a3b8"/> },
        { key: 'dependentServices', label: 'Dependencies', icon: <Hash size={10} color="#94a3b8"/> },
    ];

    useEffect(() => {
        const init = async () => {
            try {
                const res = await API.get("/reports/schedule-init");
                setDomains(res.data.domains || []);
                const schedRes = await API.get("/reports/my-schedule");
                setActiveSchedules(schedRes.data || []);
            } catch (err) { console.error(err); }
        };
        init();
    }, []);

    // Time Formatting Logic
    const onTimeChange = (event, selectedDate) => {
        setShowTimePicker(Platform.OS === 'ios'); // iOS stays open, Android closes
        if (selectedDate) {
            const hours = selectedDate.getHours().toString().padStart(2, '0');
            const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
            setFormData(prev => ({ ...prev, time: `${hours}:${minutes}` }));
        }
    };

    // (Same logic for handleDomainSelect, handleToggleAsset, updateMetric, handleSave, handleDelete as previous code)
    const handleDomainSelect = async (domain) => {
        setIsDomainModalOpen(false);
        setFormData(prev => ({ ...prev, targetDomainId: domain._id }));
        setSelectedAssets([]);
        try {
            const res = await API.get(`/asset-discovery/${domain._id}/assets`);
            setAvailableAssets(res.data.assets || []);
        } catch (err) { console.error(err); }
    };

    const handleToggleAsset = (assetId) => {
        setSelectedAssets(prev => {
            const exists = prev.find(a => a.assetId === assetId);
            if (exists) return prev.filter(a => a.assetId !== assetId);
            return [...prev, {
                assetId,
                businessContext: { assetCriticality: 5, confidentialityWeight: 5, integrityWeight: 5, availabilityWeight: 5, slaRequirement: 5, dependentServices: 0 }
            }];
        });
    };

    const updateMetric = (assetId, key, val) => {
        setSelectedAssets(prev => prev.map(a => 
            a.assetId === assetId ? { ...a, businessContext: { ...a.businessContext, [key]: val } } : a
        ));
    };

    const handleSave = async () => {
        if (!formData.scheduleName || !formData.targetDomainId || selectedAssets.length === 0) {
            Alert.alert("Error", "Missing required parameters.");
            return;
        }
        setLoading(true);
        try {
            await API.post("/reports/schedule", { ...formData, selectedAssets, isEnabled: true });
            setFormData(DEFAULT_FORM_STATE);
            setSelectedAssets([]);
            setAvailableAssets([]);
            const schedRes = await API.get("/reports/my-schedule");
            setActiveSchedules(schedRes.data);
            Alert.alert("Success", "Registry Updated.");
        } catch (err) { Alert.alert("Error", "Save failed."); }
        finally { setLoading(false); }
    };

    const handleDelete = async (id) => {
        try {
            await API.delete(`/reports/schedule/${id}`);
            setActiveSchedules(prev => prev.filter(s => s._id !== id));
        } catch (err) { console.error(err); }
    };

    // Helper for Picker initialization
    const getPickerDate = () => {
        const [h, m] = formData.time.split(':');
        const d = new Date();
        d.setHours(parseInt(h), parseInt(m));
        return d;
    };

    return (
        <View className="flex-1 bg-white dark:bg-[#0b0f19]">
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={{ paddingTop: insets.top + 20, paddingHorizontal: 24, paddingBottom: 150 }}>
                    
                    {/* Header */}
                    <TouchableOpacity onPress={() => router.back()} className="flex-row items-center mb-6">
                        <ArrowLeft size={16} color="#94a3b8" />
                        <Text className="text-slate-400 text-[10px] font-black uppercase ml-2 italic">Reporting Registry</Text>
                    </TouchableOpacity>

                    <View className="bg-slate-900 rounded-[2.5rem] p-8 border border-slate-800 mb-8 shadow-2xl">
                        <View className="p-4 bg-orange-500 rounded-3xl self-start mb-6 shadow-lg shadow-orange-500/50">
                            <Calendar size={20} color="white" />
                        </View>
                        <Text className="text-white text-3xl font-black italic uppercase tracking-tighter">Report Scheduler</Text>
                        <Text className="text-slate-500 text-[10px] font-bold uppercase mt-1 tracking-widest">Autonomous Audit Automation</Text>
                    </View>

                    <View className="space-y-6">
                        {/* Audit Name */}
                        <View>
                            <Text className="text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Schedule Identifier</Text>
                            <TextInput 
                                className="bg-slate-50 dark:bg-slate-900 mb-5 p-5 rounded-2xl text-slate-900 dark:text-white font-black text-xs border border-slate-100 dark:border-slate-800"
                                placeholder="E.G. WEEKLY INFRA AUDIT"
                                placeholderTextColor="#64748b"
                                value={formData.scheduleName}
                                onChangeText={(t) => setFormData({...formData, scheduleName: t.toUpperCase()})}
                            />
                        </View>

                        {/* Project Modules */}
                        <View>
                            <Text className="text-[10px] font-black text-slate-400 uppercase mb-3 ml-1">Included Intelligence Modules</Text>
                            <View className="flex-row gap-2 mb-5">
                                {[{ id: 'assets', label: 'Assets', icon: Database }, { id: 'cboms', label: 'CBOMs', icon: FileCode }, { id: 'scanResults', label: 'Scans', icon: Activity }].map(mod => (
                                    <TouchableOpacity 
                                        key={mod.id}
                                        onPress={() => setFormData({...formData, includeSections: { ...formData.includeSections, [mod.id]: !formData.includeSections[mod.id] }})}
                                        className={`flex-1 flex-row items-center justify-center gap-2 p-4 rounded-2xl border ${formData.includeSections[mod.id] ? 'bg-orange-500 border-orange-500' : 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800'}`}
                                    >
                                        <mod.icon size={12} color={formData.includeSections[mod.id] ? 'white' : '#64748b'} />
                                        <Text className={`text-[9px] font-black uppercase ${formData.includeSections[mod.id] ? 'text-white' : 'text-slate-500'}`}>{mod.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Domain Dropdown */}
                        <View>
                            <Text className="text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Target Domain Scope</Text>
                            <TouchableOpacity onPress={() => setIsDomainModalOpen(true)} className="bg-slate-50 mb-2 dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 flex-row justify-between items-center">
                                <View className="flex-row items-center gap-3">
                                    <Globe size={16} color="#f97316" />
                                    <Text className="text-slate-900 dark:text-white font-black text-xs uppercase">{domains.find(d => d._id === formData.targetDomainId)?.domainName || "Select Scope Domain"}</Text>
                                </View>
                                <ChevronDown size={16} color="#94a3b8" />
                            </TouchableOpacity>
                        </View>

                        {/* Asset Selection (Scan Module Style) */}
                        {availableAssets.length > 0 && (
                            <View className="bg-slate-50 mt-2 dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800">
                                <View className="flex-row items-center justify-between mb-4">
                                    <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Network Topography</Text>
                                    <Text className="text-[9px] font-black text-orange-500">{selectedAssets.length} Selected</Text>
                                </View>
                                <TextInput placeholder="Filter nodes..." placeholderTextColor="#94a3b8" className="bg-white dark:bg-slate-800 p-3 rounded-xl text-[10px] font-black border border-slate-200 dark:border-slate-700 mb-4" onChangeText={setSearchTerm} />
                                <View className="max-h-60 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
                                    <ScrollView nestedScrollEnabled className="bg-white dark:bg-slate-800">
                                        {availableAssets.filter(a => a.host.toLowerCase().includes(searchTerm.toLowerCase())).map(asset => {
                                            const isSelected = selectedAssets.some(s => s.assetId === asset._id);
                                            return (
                                                <TouchableOpacity key={asset._id} onPress={() => handleToggleAsset(asset._id)} className={`p-4 flex-row justify-between items-center border-b border-slate-50 dark:border-slate-700 ${isSelected ? 'bg-orange-50 dark:bg-orange-500/10' : ''}`}>
                                                    <View><Text className="text-[10px] font-black dark:text-white uppercase">{asset.host}</Text><Text className="text-[8px] font-mono text-slate-400">{asset.ip}</Text></View>
                                                    {isSelected && <CheckCircle2 size={16} color="#f97316" />}
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </ScrollView>
                                </View>
                            </View>
                        )}

                        {/* Six Parameters Sliders */}
                        {selectedAssets.length > 0 && (
                            <View className="space-y-4 my-2">
                                <Text className="text-[10px] font-black mb-2 text-orange-500 uppercase ml-1 tracking-widest">Risk Parameter Matrix</Text>
                                {selectedAssets.map(selection => {
                                    const asset = availableAssets.find(a => a._id === selection.assetId);
                                    return (
                                        <View key={selection.assetId} className="bg-white mb-3 dark:bg-slate-900 border-2 border-orange-100 dark:border-orange-500/20 rounded-[2.5rem] p-6 shadow-sm">
                                            <View className="flex-row items-center gap-2 mb-6">
                                                <Database size={12} color="#f97316" />
                                                <Text className="text-[11px] font-black text-slate-800 dark:text-white uppercase italic">{asset?.host}</Text>
                                            </View>
                                            <View className="flex-row flex-wrap justify-between">
                                                {configFields.map(field => (
                                                    <MetricSlider 
                                                        key={field.key}
                                                        label={field.label}
                                                        icon={field.icon}
                                                        value={selection.businessContext[field.key]} 
                                                        onChange={(v) => updateMetric(selection.assetId, field.key, v)} 
                                                        isDark={isDark}
                                                    />
                                                ))}
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                        )}

                        {/* Frequency & NATIVE TIME PICKER */}
                        <View className="flex-row gap-4 mb-4">
                            <View className="flex-[1.5]">
                                <Text className="text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Frequency</Text>
                                <View className="flex-row bg-slate-50 dark:bg-slate-900 p-1 rounded-2xl border border-slate-100 dark:border-slate-800">
                                    {['Daily', 'Weekly', 'Monthly'].map(f => (
                                        <TouchableOpacity key={f} onPress={() => setFormData({...formData, frequency: f})} className={`flex-1 py-3 rounded-xl ${formData.frequency === f ? 'bg-orange-500' : ''}`}>
                                            <Text className={`text-center text-[9px] font-black uppercase ${formData.frequency === f ? 'text-white' : 'text-slate-500'}`}>{f}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                            <View className="flex-1">
                                <Text className="text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Sync Time</Text>
                                <TouchableOpacity 
                                    onPress={() => setShowTimePicker(true)}
                                    className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex-row items-center h-[55px]"
                                >
                                    <Clock size={14} color="#f97316" />
                                    <Text className="ml-3 text-slate-900 dark:text-white font-black text-xs">{formData.time}</Text>
                                </TouchableOpacity>
                                {showTimePicker && (
                                    <DateTimePicker
                                        value={getPickerDate()}
                                        mode="time"
                                        is24Hour={true}
                                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                        onChange={onTimeChange}
                                    />
                                )}
                            </View>
                        </View>

                        {/* Email Section */}
                        <View className="bg-slate-900 p-8 rounded-[2.5rem] relative overflow-hidden">
                            <View className="flex-row items-center gap-3 mb-6">
                                <Mail size={18} color="#f97316" />
                                <Text className="text-white font-black uppercase text-[10px] tracking-widest">Email Delivery Registry</Text>
                            </View>
                            <TextInput 
                                className="bg-slate-800 p-4 rounded-xl text-white font-bold text-xs mb-6 border border-slate-700"
                                value={formData.email}
                                onChangeText={(t) => setFormData({...formData, email: t})}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                            <TouchableOpacity onPress={handleSave} disabled={loading} className="bg-orange-500 p-6 rounded-[2rem] flex-row justify-center items-center gap-3 shadow-xl">
                                {loading ? <ActivityIndicator color="white" /> : (
                                    <>
                                        <Text className="text-white font-black uppercase text-xs tracking-widest">Register Schedule</Text>
                                        <ArrowRight size={18} color="white" />
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>

                        {/* Active Schedules Registry */}
                        {activeSchedules.map((s) => (
                            <View key={s._id} className="bg-slate-50 my-2 dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 flex-row justify-between items-center">
                                <View>
                                    <Text className="text-slate-900 dark:text-white font-black uppercase text-sm italic">{s.scheduleName}</Text>
                                    <Text className="text-slate-500 text-[10px] font-bold uppercase mt-1">{s.frequency} • {s.time} IST</Text>
                                </View>
                                <TouchableOpacity onPress={() => handleDelete(s._id)} className="p-3 bg-red-50 dark:bg-red-500/10 rounded-xl">
                                    <Trash2 size={16} color="#ef4444" />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                </View>
            </ScrollView>

            {/* DOMAIN PICKER MODAL */}
            <Modal visible={isDomainModalOpen} transparent animationType="fade">
                <TouchableOpacity className="flex-1 bg-black/60 justify-center items-center p-6" onPress={() => setIsDomainModalOpen(false)}>
                    <View className="w-full bg-white dark:bg-[#0b0f19] rounded-[2.5rem] overflow-hidden max-h-[60%] border border-slate-800 shadow-2xl">
                        <View className="p-6 bg-slate-900 flex-row justify-between items-center">
                            <Text className="text-white font-black uppercase text-xs tracking-widest">Select Scope Domain</Text>
                            <TouchableOpacity onPress={() => setIsDomainModalOpen(false)}><X size={20} color="white" /></TouchableOpacity>
                        </View>
                        <FlatList data={domains} keyExtractor={i => i._id} contentContainerStyle={{ padding: 16 }} renderItem={({ item }) => (
                            <TouchableOpacity onPress={() => handleDomainSelect(item)} className="p-5 mb-2 rounded-2xl bg-slate-50 dark:bg-slate-800 flex-row items-center gap-4">
                                <Globe size={16} color="#f97316" />
                                <Text className="text-xs font-black uppercase text-slate-700 dark:text-slate-300">{item.domainName}</Text>
                            </TouchableOpacity>
                        )} />
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}