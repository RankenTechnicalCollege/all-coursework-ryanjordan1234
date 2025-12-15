import * as dotenv from 'dotenv';
dotenv.config();

import { betterAuth } from "better-auth";
import { getClient } from './database.js';
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { getDatabase } from "./database.js";

const db = await getDatabase();

export const auth = betterAuth({
    baseURL: process.env.BETTER_AUTH_URL || "http://localhost:8080",
    secret: process.env.BETTER_AUTH_SECRET || "default-secret-change-in-production",
    
    trustedOrigins: [
        "http://localhost:5173", 
        "http://localhost:3000", 
        "http://localhost:8080"
    ],
    
    database: mongodbAdapter(db),
    
    emailAndPassword: { 
        enabled: true,
        minPasswordLength: 6,
    },
    
    socialProviders: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID || "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
        }
    },
    
    session: {
        expiresIn: 60 * 60 * 24 * 7,
        updateAge: 60 * 60 * 24,
        cookieCache: {
            enabled: true,
            maxAge: 60 * 5
        }
    },
    
    user: {
        additionalFields: {
            givenName: { type: "string", required: false },
            familyName: { type: "string", required: false },
            fullName: { type: "string", required: false },
            role: {
                type: "string",
                required: false,
                defaultValue: "user"
            }
        }
    },
    
    advanced: {
        cookiePrefix: "issue-tracker",
        useSecureCookies: process.env.NODE_ENV === "production",
    }
});