import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const Card = ({ className, children, ...props }) => {
    return (
        <div
            className={twMerge(clsx(
                "rounded-xl border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:shadow-md",
                className
            ))}
            {...props}
        >
            {children}
        </div>
    );
};
