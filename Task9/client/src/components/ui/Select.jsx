import { Fragment } from 'react'
import { Listbox, Transition } from '@headlessui/react'
import { Check, ChevronDown } from 'lucide-react'
import clsx from 'clsx'

export default function Select({
  label,
  value,
  onChange,
  options = [],
  placeholder = 'Select an option',
  error,
  disabled = false,
  className,
}) {
  const selectedOption = options.find(opt => opt.value === value)
  
  return (
    <div className={className}>
      {label && (
        <label className="label">{label}</label>
      )}
      <Listbox value={value} onChange={onChange} disabled={disabled}>
        <div className="relative">
          <Listbox.Button
            className={clsx(
              'input flex items-center justify-between text-left',
              error && 'input-error',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <span className={clsx(!selectedOption && 'text-surface-400')}>
              {selectedOption?.label || placeholder}
            </span>
            <ChevronDown className="w-4 h-4 text-surface-400" />
          </Listbox.Button>
          
          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Listbox.Options className="absolute z-50 w-full mt-1 max-h-60 overflow-auto rounded-xl bg-white dark:bg-surface-800 py-1 shadow-lg border border-surface-200 dark:border-surface-700 focus:outline-none">
              {options.map((option) => (
                <Listbox.Option
                  key={option.value}
                  value={option.value}
                  className={({ active }) => clsx(
                    'relative cursor-pointer select-none py-2.5 pl-10 pr-4',
                    active ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400' : 'text-surface-900 dark:text-surface-100'
                  )}
                >
                  {({ selected }) => (
                    <>
                      <span className={clsx('block truncate', selected && 'font-medium')}>
                        {option.label}
                      </span>
                      {selected && (
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-primary-600 dark:text-primary-400">
                          <Check className="w-4 h-4" />
                        </span>
                      )}
                    </>
                  )}
                </Listbox.Option>
              ))}
            </Listbox.Options>
          </Transition>
        </div>
      </Listbox>
      {error && (
        <p className="mt-1.5 text-sm text-danger-500">{error}</p>
      )}
    </div>
  )
}
