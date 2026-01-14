export default function Button({ 
  children, 
  onClick, 
  type = 'button', 
  variant = 'primary',
  disabled = false,
  loading = false,
  fullWidth = true,
  icon
}) {
  const baseStyles = 'relative px-6 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] disabled:transform-none disabled:cursor-not-allowed flex items-center justify-center gap-2';
  
  const variants = {
    primary: 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl disabled:from-gray-400 disabled:to-gray-400',
    secondary: 'bg-white border-2 border-gray-300 hover:border-blue-500 text-gray-700 hover:text-blue-600 shadow-md hover:shadow-lg disabled:border-gray-200 disabled:text-gray-400',
    ghost: 'bg-transparent hover:bg-gray-100 text-gray-700 hover:text-blue-600'
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseStyles} ${variants[variant]} ${fullWidth ? 'w-full' : ''}`}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-inherit rounded-xl">
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      <span className={loading ? 'invisible' : 'flex items-center gap-2'}>
        {icon && icon}
        {children}
      </span>
    </button>
  );
}
