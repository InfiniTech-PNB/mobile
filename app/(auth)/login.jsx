import React, { useState, useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  View, Text, TextInput, TouchableOpacity, ScrollView, 
  KeyboardAvoidingView, Platform, ActivityIndicator 
} from 'react-native';
import { Mail, Key, ShieldEllipsis, LogIn, ArrowLeft, RefreshCcw, ShieldCheck, Zap } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import API from '../../services/api';
import * as SecureStore from 'expo-secure-store';

export default function Login() {
    const [step, setStep] = useState(1);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [otp, setOtp] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [timer, setTimer] = useState(0);

    const { login } = useAuth();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    useEffect(() => {
        let interval = null;
        if (timer > 0) {
            interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
        }
        return () => clearInterval(interval);
    }, [timer]);

    const handleLogin = async () => {
        if (!email || !password) {
            setError("Please fill in all fields");
            return;
        }
        try {
            setLoading(true);
            setError(null);
            await API.post("/auth/login", { email, password });
            setStep(2);
            setTimer(59);
        } catch (err) {
            setError(err.response?.data?.message || "Invalid credentials. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
        if (!otp || otp.length < 6) {
            setError("Please enter a valid 6-digit code");
            return;
        }
        try {
            setLoading(true);
            setError(null);
            const response = await API.post("/auth/verify-otp", { email, otp });
            await login(response.data.token);
            console.log("OTP Verified. Waiting for redirect...");
        } catch (err) {
            setError(err.response?.data?.message || "Invalid OTP. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        // 1. Wrap the entire screen in KeyboardAvoidingView
        // 2. Use 'padding' for iOS and 'height' for Android
        <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1, paddingTop: insets.top }}
            className="bg-[#f0f2f5]"
        >
            <ScrollView 
                // 3. flexGrow: 1 allows the ScrollView to expand and move
                contentContainerStyle={{
                    flexGrow: 1,
                    paddingBottom: insets.bottom + 20 // Increased padding to ensure keyboard doesn't cover button
                }} 
                className="relative"
                bounces={false}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* TOP BRANDING */}
                <View className="bg-white p-4 flex-row justify-between items-center border-b border-gray-100">
                    <View className="flex-row items-center space-x-2">
                        <View className="bg-black p-1.5 rounded">
                            <ShieldCheck size={18} color="white" />
                        </View>
                        <Text className="font-black text-lg tracking-tighter">  SECURITY_OS</Text>
                    </View>
                    <Text className="text-gray-400 text-[10px] font-mono">V2.4.0_STABLE</Text>
                </View>

                <View className="flex-1 px-8 pt-5">
                    {/* INFO PANEL */}
                    <View className="my-3 bg-amber-400 p-6 rounded-[2.5rem] shadow-md">
                        <View className="flex-row items-center space-x-2 bg-white/30 self-start px-3 py-1 rounded-full mb-4">
                            <Zap size={12} color="black" />
                            <Text className="text-[10px] font-black uppercase tracking-widest">2026 Hackathon</Text>
                        </View>
                        <Text className="text-4xl font-black text-amber-950 leading-[1]">PSB{"\n"}HACKATHON{"\n"}SERIES</Text>
                        <Text className="text-amber-900/80 font-medium mt-4">In collaboration with IIT Kanpur.</Text>
                    </View>

                    {/* FORM TITLES */}
                    <View className="mt-4">
                        {step === 2 && (
                            <TouchableOpacity
                                onPress={() => { setStep(1); setError(null); setOtp("") }}
                                className="flex-row items-center mb-6"
                            >
                                <ArrowLeft size={16} color="#94a3b8" />
                                <Text className="ml-2 text-slate-400 font-bold text-xs uppercase tracking-widest">Back</Text>
                            </TouchableOpacity>
                        )}

                        <Text className="text-3xl font-black text-slate-900 tracking-tight">
                            {step === 1 ? "Portal Login" : "Enter Code"}
                        </Text>
                        <Text className="text-slate-500 mt-2 font-medium">
                            {step === 1 ? "Verify your credentials." : "Please check your inbox."}
                        </Text>
                    </View>

                    {/* INPUTS SECTION */}
                    <View className="mt-6 space-y-6">
                        {step === 1 ? (
                            <>
                                <View>
                                    <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Email</Text>
                                    <View className="flex-row items-center bg-white border-2 border-slate-100 rounded-3xl px-5 py-4 shadow-sm">
                                        <Mail size={20} color="#cbd5e1" />
                                        <TextInput
                                            className="flex-1 ml-3 font-bold text-slate-800"
                                            placeholder="Email"
                                            value={email}
                                            onChangeText={setEmail}
                                            autoCapitalize="none"
                                        />
                                    </View>
                                </View>

                                <View>
                                    <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest my-2 ml-4">Password</Text>
                                    <View className="flex-row items-center bg-white border-2 border-slate-100 rounded-3xl px-5 py-4 shadow-sm">
                                        <Key size={20} color="#cbd5e1" />
                                        <TextInput
                                            className="flex-1 ml-3 font-bold text-slate-800"
                                            placeholder="••••••••"
                                            secureTextEntry
                                            value={password}
                                            onChangeText={setPassword}
                                        />
                                    </View>
                                </View>
                            </>
                        ) : (
                            <View>
                                <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Security OTP</Text>
                                <View className="flex-row items-center bg-white border-2 border-slate-100 rounded-3xl px-5 py-5 shadow-sm">
                                    <ShieldEllipsis size={20} color="#cbd5e1" />
                                    <TextInput
                                        className="flex-1 text-center font-bold text-2xl tracking-[10px]"
                                        placeholder="000000"
                                        keyboardType="number-pad"
                                        maxLength={6}
                                        value={otp}
                                        onChangeText={setOtp}
                                    />
                                </View>
                            </View>
                        )}

                        {error && (
                            <View className="bg-red-50 border border-red-100 rounded-xl p-3 mt-2">
                                <Text className="text-red-600 text-[11px] font-bold text-center">{error}</Text>
                            </View>
                        )}

                        <TouchableOpacity
                            onPress={step === 1 ? handleLogin : handleVerifyOtp}
                            disabled={loading}
                            className="bg-slate-900 py-5 mt-5 rounded-3xl flex-row justify-center items-center shadow-lg active:scale-95"
                        >
                            <Text className="text-white font-black uppercase tracking-[0.2em] text-xs mr-2">
                                {loading ? "Processing..." : step === 1 ? "Send OTP" : "Verify & Signin"}
                            </Text>
                            {loading ? <ActivityIndicator color="white" size="small" /> : <LogIn size={16} color="white" />}
                        </TouchableOpacity>
                    </View>

                    {step === 2 && (
                        <View className="mt-8 items-center">
                            <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Code not arrived?</Text>
                            <TouchableOpacity disabled={timer > 0 || loading} onPress={handleLogin}>
                                <View className="flex-row items-center">
                                    <RefreshCcw size={12} color={timer > 0 ? "#cbd5e1" : "#d97706"} />
                                    <Text className={`ml-2 text-[11px] font-black uppercase tracking-widest ${timer > 0 ? 'text-slate-300' : 'text-amber-600'}`}>
                                        {timer > 0 ? `Resend in 00:${timer < 10 ? `0${timer}` : timer}` : "Resend Security Code"}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* FOOTER */}
                <View className="py-10 items-center">
                    <View className="flex-row items-center opacity-50">
                        <ShieldCheck size={12} color="green" />
                        <Text className="ml-2 text-[9px] font-bold uppercase">Secure AES-256 Connection Verified — IP: 192.168.1.104</Text>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}