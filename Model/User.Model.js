import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({

    username: {
        type: String,
        required: [true, "Username is required"],
        unique: true
    },
    name: {
        type: String,
        required: [true, "Name is required"],
        trim: true
    },
    email: {
        type: String,
        required: [true, "Email is required"],
        unique: true,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, "Please use a valid email address"]
    },
    password: {
        type: String,
        required: [true, "Password is required"],
        minlength: [6, "Password must be at least 6 characters long"]
    },
    profilePicture: {
        type: String,
        default: ""
    },
    accessToken: {
        type: String,
        default: null
    },
    refreshToken: {
        type: String,
        default: null
    },
    // Token rotation tracking
    tokenVersion: {
        type: Number,
        default: 1,
        description: "Version number for token rotation - increment on logout/forced refresh"
    },
    lastTokenRotation: {
        type: Date,
        default: null,
        description: "Timestamp of last token rotation"
    },
    lastRefresh: {
        type: Date,
        default: null,
        description: "Timestamp of last token refresh"
    },
    // Security tracking
    isLoggedOut: {
        type: Boolean,
        default: false,
        description: "Flag to mark user as logged out"
    },
    loginHistory: [{
        timestamp: {
            type: Date,
            default: Date.now
        },
        ipAddress: String,
        userAgent: String
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

const UserModel = mongoose.model("User", UserSchema);

export default UserModel;
