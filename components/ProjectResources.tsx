import { MasterProject, Order, CalendarEvent, ELNExperiment } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, ShoppingCart, FlaskConical, ArrowRight, Clock, AlertCircle } from "lucide-react";
import { formatCurrency } from "@/lib/constants";
import { format } from "date-fns";

interface ProjectResourcesProps {
    project: MasterProject;
    orders: Order[];
    events: CalendarEvent[];
    experiments: ELNExperiment[];
    onViewOrder?: (order: Order) => void;
    onViewExperiment?: (experiment: ELNExperiment) => void;
    onViewEvent?: (event: CalendarEvent) => void;
}

export function ProjectResources({
    project,
    orders,
    events,
    experiments,
    onViewOrder,
    onViewExperiment,
    onViewEvent
}: ProjectResourcesProps) {
    // Filter for upcoming events
    const upcomingEvents = events
        .filter(e => new Date(e.end) >= new Date())
        .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
        .slice(0, 5);

    // Filter for recent orders
    const recentOrders = [...orders]
        .sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime())
        .slice(0, 5);

    // Filter for recent experiments
    const recentExperiments = [...experiments]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
            {/* Events Column */}
            <Card className="h-full flex flex-col">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-blue-500" />
                        Upcoming Events
                    </CardTitle>
                    <CardDescription>
                        Milestones, deadlines, and meetings
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                    {upcomingEvents.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <Calendar className="h-10 w-10 mx-auto mb-3 opacity-20" />
                            <p>No upcoming events</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {upcomingEvents.map(event => (
                                <div
                                    key={event.id}
                                    className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                                    onClick={() => onViewEvent?.(event)}
                                >
                                    <div className={`w-1 h-full min-h-[2.5rem] rounded-full ${event.type === 'milestone' ? 'bg-red-500' :
                                            event.type === 'deadline' ? 'bg-orange-500' : 'bg-blue-500'
                                        }`} />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm truncate">{event.title}</p>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                            <Clock className="h-3 w-3" />
                                            <span>{format(new Date(event.start), "MMM d, h:mm a")}</span>
                                        </div>
                                    </div>
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
                                        {event.type}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    )}
                    <Button variant="ghost" className="w-full mt-4 text-xs" size="sm">
                        View Calendar <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                </CardContent>
            </Card>

            {/* Orders Column */}
            <Card className="h-full flex flex-col">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ShoppingCart className="h-5 w-5 text-green-500" />
                        Recent Orders
                    </CardTitle>
                    <CardDescription>
                        Latest purchases and requests
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                    {recentOrders.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <ShoppingCart className="h-10 w-10 mx-auto mb-3 opacity-20" />
                            <p>No recent orders</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {recentOrders.map(order => (
                                <div
                                    key={order.id}
                                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                                    onClick={() => onViewOrder?.(order)}
                                >
                                    <div className="flex-1 min-w-0 mr-3">
                                        <p className="font-medium text-sm truncate">{order.productName}</p>
                                        <p className="text-xs text-muted-foreground truncate">{order.supplier}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-medium">{formatCurrency(order.priceExVAT, order.currency)}</p>
                                        <Badge
                                            variant="secondary"
                                            className={`text-[10px] px-1.5 py-0 h-5 ${order.status === 'received' ? 'bg-green-100 text-green-700' :
                                                    order.status === 'ordered' ? 'bg-blue-100 text-blue-700' :
                                                        'bg-yellow-100 text-yellow-700'
                                                }`}
                                        >
                                            {order.status}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    <Button variant="ghost" className="w-full mt-4 text-xs" size="sm">
                        View All Orders <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                </CardContent>
            </Card>

            {/* Experiments Column */}
            <Card className="h-full flex flex-col">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FlaskConical className="h-5 w-5 text-purple-500" />
                        Experiments
                    </CardTitle>
                    <CardDescription>
                        Linked ELN experiments
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                    {recentExperiments.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <FlaskConical className="h-10 w-10 mx-auto mb-3 opacity-20" />
                            <p>No linked experiments</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {recentExperiments.map(exp => (
                                <div
                                    key={exp.id}
                                    className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                                    onClick={() => onViewExperiment?.(exp)}
                                >
                                    <div className="mt-1">
                                        <FlaskConical className="h-4 w-4 text-purple-500" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm truncate">{exp.title}</p>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                            <span>{format(new Date(exp.createdAt), "MMM d, yyyy")}</span>
                                            {exp.status && (
                                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                                                    {exp.status}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    <Button variant="ghost" className="w-full mt-4 text-xs" size="sm">
                        Open ELN <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
