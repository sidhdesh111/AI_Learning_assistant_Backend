export async function ErrorHandler(err, req, res, next) {
    let statusCode = err.statusCode || 500;
    let message = err.message || "Internal Server Error";

    if (err.name === "CastError") {
        message = "Rersource not found.",
            statusCode = 404;
    }

    if (err.code === 11000) {
        message = "Duplicate Key Error";
        statusCode = 400;
    }

    if (err.name === "ValidationError") {
        message = Object.values(err.errors).map((value) => value.message).join(", ");
        statusCode = 400;
    }

    if (err.code === "LIMIT_FILE_SIZE") {
        message = "File size is too large. Maximum limit is 10MB.";
        statusCode = 400;
    }

    if (err.code === "LIMIT_PART_COUNT") {
        message = "Too many parts in multipart request.";
        statusCode = 400;
    }

    if (err.code === "LIMIT_FILE_COUNT") {
        message = "Too many files in request.";
        statusCode = 400;
    }

    if (err.message && err.message.includes("Only PDF files are allowed")) {
        message = "Only PDF files are allowed for upload.";
        statusCode = 400;
    }

    if (err.name === "JsonWebTokenError") {
        message = "Invalid Token. Please log in again.";
        statusCode = 401;
    }

    if (err.name === "TokenExpiredError") {
        message = "Your token has expired. Please log in again.";
        statusCode = 401;
    }

    console.error('Error:', {
        message: err.message,
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });

    res.status(statusCode).json({
        success: false,
        message,
        statusCode,
        ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    })
}