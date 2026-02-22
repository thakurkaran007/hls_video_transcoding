"use client";

import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoginSchema } from "@/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@repo/ui/src/components/form";
import { Input } from "@repo/ui/src/components/input";
import { Button } from "@repo/ui/src/components/button";
import { useEffect, useState, useTransition } from "react";
import { login } from "@/actions/login";
import { CardWrapper } from "./CardWrapper";
import axios from "axios";
import { FormError, FormSuccess } from "./form-condition";
import { useSearchParams } from "next/navigation";

export const LoginForm = () => {
    const searchParams = useSearchParams();
    const urlError = searchParams.get("error") === "OAuthAccountNotLinked" ? "Email already in use" : "";
    const [success, setSuccess] = useState<string>("");
    const [error, setError] = useState<string>("");
    const [disabled, setDisabled] = useState<boolean>(false);
    const [isPending, startTransition] = useTransition();

    type LoginInput = z.infer<typeof LoginSchema>;

    const form = useForm<LoginInput>({
        resolver: zodResolver(LoginSchema),
        defaultValues: {
            email: "",
            password: "",
        }
    });

    useEffect(() => {
        if (urlError === "Email already in use") setError(urlError);
    }, [urlError])

    const sendCookie = async (data: LoginInput) => {
        try {
            const res: any = await axios.post("https://backend.thakurkaran.com/api/v1/users/signin", data, { withCredentials: true });
            console.log("Response from server:", res);
            if (res.status === 200) {
                console.log("Cookie sent successfully");
                return { success: "Login Successful", token: res.data.token };
            }
            console.log("Error:", res);
            return { error: "Unexpected error" };
        } catch (error: any) {
            console.log("Error sending cookie:", error);
            return { error: error?.response?.data?.message || "Something went wrong" };
        }
    }

    const submit = async (values: LoginInput) => {
        setDisabled(true);
        startTransition(async () => {
            const response = await login(values);
            console.log("Login response:", response);
            if (response && response.error) {
                setSuccess("");
                setError(response.error);
                setDisabled(false);
            }
            if (response && response.success) {
                setSuccess(response.success);
                if (response.redirect) {
                    console.log("Sending cookie to server...");
                    const req = await sendCookie(values);
                    if (req.error) {
                        setError(req.error);
                        console.log("Error sending cookie:", req.error);
                        setSuccess("");
                        setDisabled(false);
                    }
                    if (req.success) {
                        console.log("Cookie sent successfully");
                        setSuccess(req.success);
                        localStorage.setItem("jwt", req.token)
                        setError("");
                        window.location.href = response.redirect;
                    }
                }
                setError("");
                form.reset();
                // note: we leave disabled true while redirecting or waiting, per your request
            }
        });
    };

    // New handler for the demo/default login button
    const handleDefaultLogin = () => {
        // disable UI immediately so user can't interact while we autofill + submit
        setDisabled(true);

        // set values (mark dirty/validate)
        form.setValue("email", "x@gmail.com", { shouldValidate: true, shouldDirty: true });
        form.setValue("password", "karant", { shouldValidate: true, shouldDirty: true });

        // programmatically submit using existing submit function (preserves all behavior)
        // form.handleSubmit returns a function that accepts the event; call it immediately
        form.handleSubmit(submit)();
    };

    return (
        <CardWrapper
            headerLabel="Welcome Back"
            backButtonLabel="Don't have an account?"
            backButtonhref="/auth/signup"
            showSocial={true}
        >
            <Form {...form}>
                <form onSubmit={form.handleSubmit(submit)} className="space-y-6">
                    <div className="space-y-4">
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl>
                                        <Input
                                            {...field}
                                            placeholder="john@gmail.com"
                                            type="email"
                                            // disable when transition is pending or when we've manually disabled
                                            disabled={isPending || disabled}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Password</FormLabel>
                                    <FormControl>
                                        <Input
                                            {...field}
                                            placeholder="********"
                                            type="password"
                                            disabled={isPending || disabled}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    {/* Demo / default login button (pretty) */}
                    <div className="flex flex-col gap-2">
                        <Button
                            type="button"
                            onClick={handleDefaultLogin}
                            className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold py-2 rounded-lg shadow-md hover:opacity-95"
                            disabled={disabled || isPending}
                            aria-label="Login with demo account"
                        >
                            {/* you can replace text with an icon if your Button supports it */}
                            Use demo account — x@gmail.com
                        </Button>
                    </div>

                    {error && !success && <FormError message={error} />}
                    {success && !error && <FormSuccess message={success} />}

                    <Button type="submit" className="w-full" disabled={disabled || isPending}>
                        {isPending ? "Logging in…" : "Login"}
                    </Button>
                </form>
            </Form>
        </CardWrapper>
    )
}