import { formatDistanceToNow } from 'date-fns';

interface TimelineEvent {
    id: number;
    eventType: string;
    action: string | null;
    actor: { id: number; name: string } | null;
    createdAt: string;
    payload: any;
}

interface IssueTimelineProps {
    events: TimelineEvent[];
}

const eventTypeLabels: Record<string, string> = {
    'issue.created': 'created the issue',
    'issue.status_changed': 'changed the status',
    'issue.priority_changed': 'changed the priority',
    'issue.comment_added': 'added a comment',
    'issue.decision_recorded': 'recorded a decision',
    'issue.evaluated': 'evaluated the adaptation',
};

const getEventLabel = (event: TimelineEvent): string => {
    return eventTypeLabels[event.eventType] || event.eventType.replace('issue.', '');
};

export const IssueTimeline = ({ events }: IssueTimelineProps) => {
    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">History</h3>
            <div className="relative">
                {/* Vertical timeline line */}
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

                <div className="space-y-6">
                    {events.map((event) => (
                        <div key={event.id} className="relative flex items-start gap-4">
                            {/* Timeline node */}
                            <div className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 ring-4 ring-white">
                                <div className="h-2 w-2 rounded-full bg-white" />
                            </div>

                            {/* Event content */}
                            <div className="flex-1 pt-1">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-gray-900">
                                        {event.actor?.name || 'System'}
                                    </span>
                                    <span className="text-gray-600">
                                        {getEventLabel(event)}
                                    </span>
                                    <span className="text-sm text-gray-500">
                                        {formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
