import React from 'react';

const line = (className = '') => (
    <div className={`animate-pulse rounded-lg bg-slate-200/80 dark:bg-slate-800 ${className}`} />
);

export default function StoreSkeleton({ variant = 'page' }) {
    if (variant === 'catalog') {
        return (
            <div className="flex flex-1 gap-8">
                <aside className="hidden w-64 shrink-0 lg:block">
                    <div className="rounded-xl border border-[#e5e1de] bg-white p-6 dark:border-[#2a313b] dark:bg-[#0f1115]">
                        <div className="space-y-3">
                            {line('h-4 w-24')}
                            {line('h-10 w-full')}
                            {line('h-10 w-full')}
                            {line('h-10 w-full')}
                            {line('mt-6 h-4 w-20')}
                            {line('h-10 w-full')}
                            {line('h-10 w-full')}
                        </div>
                    </div>
                </aside>
                <div className="grid flex-1 grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, index) => (
                        <div key={`catalog-skeleton-${index}`} className="overflow-hidden rounded-xl border border-[#e5e1de] bg-white p-4 dark:border-[#2a313b] dark:bg-[#0f1115]">
                            {line('aspect-square w-full rounded-xl')}
                            <div className="mt-4 space-y-3">
                                {line('h-5 w-3/4')}
                                {line('h-4 w-full')}
                                {line('h-4 w-2/3')}
                                {line('h-6 w-1/3')}
                                {line('h-10 w-full rounded-xl')}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (variant === 'product') {
        return (
            <div className="space-y-10">
                {line('h-4 w-48')}
                <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.15fr_0.85fr]">
                    <div className="space-y-4">
                        <div className="rounded-3xl border border-[#e5e1de] bg-white p-4 dark:border-[#2a313b] dark:bg-[#0f1115]">
                            {line('aspect-[4/3] w-full rounded-2xl')}
                        </div>
                        <div className="grid grid-cols-4 gap-3">
                            {Array.from({ length: 4 }).map((_, index) => (
                                <div key={`thumb-skeleton-${index}`} className="rounded-xl border border-[#e5e1de] bg-white p-1 dark:border-[#2a313b] dark:bg-[#0f1115]">
                                    {line('aspect-square w-full rounded-lg')}
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="space-y-4">
                        {line('h-4 w-24')}
                        {line('h-12 w-5/6')}
                        {line('h-5 w-32')}
                        {line('h-20 w-full')}
                        {line('h-16 w-full')}
                        <div className="flex gap-3">
                            {line('h-11 w-36 rounded-xl')}
                            {line('h-11 flex-1 rounded-xl')}
                        </div>
                        {line('h-11 w-full rounded-xl')}
                    </div>
                </div>
            </div>
        );
    }

    if (variant === 'order') {
        return (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="space-y-6 lg:col-span-2">
                    {line('h-16 w-full rounded-2xl')}
                    {line('h-64 w-full rounded-2xl')}
                </div>
                <div className="space-y-6">
                    {line('h-40 w-full rounded-2xl')}
                    {line('h-40 w-full rounded-2xl')}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background-light px-4 py-10 dark:bg-background-dark md:px-10">
            <div className="mx-auto max-w-[1408px] space-y-8">
                {line('h-16 w-full rounded-2xl')}
                {line('h-80 w-full rounded-[32px]')}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                    {Array.from({ length: 3 }).map((_, index) => (
                        <div key={`page-skeleton-${index}`} className="rounded-2xl border border-[#e5e1de] bg-white p-6 dark:border-[#2a313b] dark:bg-[#0f1115]">
                            {line('h-44 w-full rounded-xl')}
                            <div className="mt-5 space-y-3">
                                {line('h-5 w-2/3')}
                                {line('h-4 w-full')}
                                {line('h-4 w-5/6')}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
