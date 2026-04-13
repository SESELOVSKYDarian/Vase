import React from 'react';

export default class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("ErrorBoundary caught an error", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex flex-col items-center justify-center bg-red-50 p-10 text-center">
                    <h1 className="text-3xl font-black text-red-600 mb-4">Ups! Algo salió mal.</h1>
                    <p className="text-red-800 font-medium max-w-lg mb-6">
                        Error: {this.state.error?.message || "Ocurrió un error inesperado en la interfaz."}
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-6 py-2 bg-red-600 text-white rounded-lg font-bold"
                    >
                        Recargar página
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
