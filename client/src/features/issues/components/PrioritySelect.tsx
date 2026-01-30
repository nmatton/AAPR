import { Listbox, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/20/solid';

export type PriorityLevel = 'LOW' | 'MEDIUM' | 'HIGH';

interface PrioritySelectProps {
    value: PriorityLevel;
    onChange: (value: PriorityLevel) => void;
    disabled?: boolean;
}

const priorityConfig = {
    LOW: { label: 'Low', className: 'bg-gray-100 text-gray-800' },
    MEDIUM: { label: 'Medium', className: 'bg-yellow-100 text-yellow-800' },
    HIGH: { label: 'High', className: 'bg-red-100 text-red-800' },
};

export const PrioritySelect = ({ value, onChange, disabled }: PrioritySelectProps) => {
    const selected = priorityConfig[value] || priorityConfig.LOW;

    return (
        <Listbox value={value} onChange={onChange} disabled={disabled}>
            <div className="relative">
                <Listbox.Button className={`relative w-full cursor-default rounded-full py-1 pl-3 pr-8 text-left shadow-sm focus:outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-white/75 focus-visible:ring-offset-2 focus-visible:ring-offset-orange-300 sm:text-sm ${selected.className}`}>
                    <span className="block truncate font-medium text-sm">{selected.label}</span>
                    <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                        <ChevronUpDownIcon
                            className="h-4 w-4 text-gray-500"
                            aria-hidden="true"
                        />
                    </span>
                </Listbox.Button>
                <Transition
                    as={Fragment}
                    leave="transition ease-in duration-100"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <Listbox.Options className="absolute mt-1 max-h-60 w-full min-w-[120px] overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm z-50">
                        {Object.entries(priorityConfig).map(([key, config]) => (
                            <Listbox.Option
                                key={key}
                                className={({ active }) =>
                                    `relative cursor-default select-none py-2 pl-10 pr-4 ${active ? 'bg-amber-100 text-amber-900' : 'text-gray-900'
                                    }`
                                }
                                value={key}
                            >
                                {({ selected }) => (
                                    <>
                                        <span
                                            className={`block truncate ${selected ? 'font-medium' : 'font-normal'
                                                }`}
                                        >
                                            {config.label}
                                        </span>
                                        {selected ? (
                                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-amber-600">
                                                <CheckIcon className="h-5 w-5" aria-hidden="true" />
                                            </span>
                                        ) : null}
                                    </>
                                )}
                            </Listbox.Option>
                        ))}
                    </Listbox.Options>
                </Transition>
            </div>
        </Listbox>
    );
};
