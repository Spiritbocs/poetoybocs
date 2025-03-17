'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';

// Dynamically import PoeLogin with no SSR to avoid hydration issues
const PoeLogin = dynamic(() => import('../app/components/PoeLogin'), { ssr: false });

const Navbar = () => {
  const pathname = usePathname();
  
  return (
    <nav className="bg-[#0c0c0e] border-b border-[#3d3d3d] mb-6 shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <span className="text-xl font-bold text-[#af6025]" style={{ textShadow: '0 0 10px rgba(175, 96, 37, 0.5)' }}>
                PoE Tools
              </span>
            </div>
            <div className="ml-6 flex space-x-4">
              <Link 
                href="/" 
                className={`inline-flex items-center px-3 py-2 text-sm font-medium transition-all duration-200 ${
                  pathname === '/' 
                    ? 'text-[#af6025] border-b-2 border-[#af6025]' 
                    : 'text-[#a38d6d] hover:text-[#af6025] hover:border-b-2 hover:border-[#af6025] hover:opacity-80'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Item Search
              </Link>
              <Link 
                href="/currency" 
                className={`inline-flex items-center px-3 py-2 text-sm font-medium transition-all duration-200 ${
                  pathname === '/currency' 
                    ? 'text-[#af6025] border-b-2 border-[#af6025]' 
                    : 'text-[#a38d6d] hover:text-[#af6025] hover:border-b-2 hover:border-[#af6025] hover:opacity-80'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Currency Exchange
              </Link>
              <Link 
                href="/armory" 
                className={`inline-flex items-center px-3 py-2 text-sm font-medium transition-all duration-200 ${
                  pathname === '/armory' 
                    ? 'text-[#af6025] border-b-2 border-[#af6025]' 
                    : 'text-[#a38d6d] hover:text-[#af6025] hover:border-b-2 hover:border-[#af6025] hover:opacity-80'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Character Armory
              </Link>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <PoeLogin />
            <a 
              href="https://www.pathofexile.com/trade" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="inline-flex items-center px-3 py-1 border border-[#af6025] rounded-md text-sm text-[#af6025] bg-[#1a1a1a] hover:bg-[#252525] transition-colors duration-200"
            >
              Official Trade Site
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
