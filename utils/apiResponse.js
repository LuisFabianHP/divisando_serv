const successResponse = (data = {}) => ({
    success: true,
    ...data,
});

const errorResponse = (error, data = {}) => ({
    success: false,
    error,
    ...data,
});

module.exports = {
    successResponse,
    errorResponse,
};
