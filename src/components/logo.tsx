
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';

export const logoSvg = `
<svg
    width="50"
    height="50"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style="color: #0F2C59;"
>
    <path d="M12 2L2 22H22L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
    <path d="M12 11L7 22" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
    <path d="M12 11L17 22" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
    <path d="M8.5 18H15.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
</svg>
`;

export const Logo = () => {
    const { userId } = useAuth();
    const href = userId ? "/dashboard" : "/";

    return (
        <Link href={href} className="flex items-center gap-2.5">
            <svg
                width="50"
                height="50"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="text-primary shrink-0 h-10 w-10"
            >
                <path
                    d="M12 2L2 22H22L12 2Z"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                <path
                    d="M12 11.5L8 19.5"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                <path
                    d="M12 11.5L16 19.5"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                 <path
                    d="M8.5 18H15.5"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
            <div className="flex flex-col">
                <span className="font-bold text-lg sm:text-xl text-foreground leading-tight">منصة عال</span>
                <span className="text-sm text-muted-foreground leading-tight hidden sm:block tracking-wide">إدارة • تمويل • تطوير • وأكثر...</span>
            </div>
      </Link>
    )
};
