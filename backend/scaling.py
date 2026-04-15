"""Scaling decision helpers.

Thresholds are environment-configurable so they can be tuned without code
changes. Defaults follow the brief: scale up above 75%, scale down below 40%.
"""

import os


SCALE_UP_THRESHOLD = float(os.getenv("SCALE_UP_THRESHOLD", 75))
SCALE_DOWN_THRESHOLD = float(os.getenv("SCALE_DOWN_THRESHOLD", 40))
HIGH_UTIL_THRESHOLD = float(os.getenv("HIGH_UTIL_THRESHOLD", 85))


def get_scaling_level(predicted_load):
    """Determine the 4-tier scaling severity level."""
    if predicted_load >= 90:
        return "CRITICAL"
    elif predicted_load >= 75:
        return "HIGH"
    elif predicted_load >= 40:
        return "MEDIUM"
    else:
        return "LOW"

def scale_decision(predicted_load):
    """Map scaling level to actionable recommendation string."""
    level = get_scaling_level(predicted_load)
    if level == "CRITICAL":
        return "aggressive scaling"
    elif level == "HIGH":
        return "scale up"
    elif level == "LOW":
        return "reduce resources"
    else:
        return "maintain"

def get_recommended_instances(predicted_load, current_instances=4):
    """Calculate explicit server allocations based on utilization multipliers."""
    if predicted_load >= 90:
        return current_instances * 2
    elif predicted_load >= 75:
        return int(current_instances * 1.5)
    elif predicted_load < 40:
        return max(1, int(current_instances * 0.5))
    else:
        return current_instances


def get_scaling_recommendations(predicted_load, confidence):
    """Return a human-readable list of scaling recommendations for the given load."""
    recommendations = []

    if predicted_load > 90:
        recommendations.append({
            'priority': 'CRITICAL',
            'action': 'Aggressive scale-up required immediately',
            'reason': f'Predicted load {predicted_load:.1f}% exceeds critical threshold (90%)',
            'suggested_instances': 'Double current capacity',
        })
    elif predicted_load > 75:
        recommendations.append({
            'priority': 'HIGH',
            'action': 'Scale up recommended',
            'reason': f'Predicted load {predicted_load:.1f}% is above the scale-up threshold (75%)',
            'suggested_instances': 'Increase by 50%',
        })
    elif predicted_load < SCALE_DOWN_THRESHOLD:
        recommendations.append({
            'priority': 'LOW',
            'action': 'Consider scaling down to save costs',
            'reason': f'Predicted load {predicted_load:.1f}% is below the scale-down threshold ({SCALE_DOWN_THRESHOLD}%)',
            'suggested_instances': 'Reduce by 50%',
        })
    else:
        recommendations.append({
            'priority': 'INFO',
            'action': 'Maintain current capacity',
            'reason': f'Predicted load {predicted_load:.1f}% is within the optimal operating range',
            'suggested_instances': 'No change',
        })

    if confidence < 0.7:
        recommendations.append({
            'priority': 'WARNING',
            'action': 'Monitor closely',
            'reason': f'Model confidence is low ({confidence:.0%}). Manual verification recommended.',
            'suggested_instances': 'Review required',
        })

    return recommendations

def get_cost_impact(current_instances, suggested_change):
    """Calculate estimated cost impact of scaling decision"""
    # Simplified cost calculation (would integrate with cloud provider APIs in production)
    base_cost_per_instance = 0.10  # $0.10 per hour per instance
    
    if 'increase by 50%' in suggested_change:
        additional_instances = current_instances * 0.5
        cost_impact = additional_instances * base_cost_per_instance
        return f'+${cost_impact:.2f}/hour'
    elif 'increase by 25%' in suggested_change:
        additional_instances = current_instances * 0.25
        cost_impact = additional_instances * base_cost_per_instance
        return f'+${cost_impact:.2f}/hour'
    elif 'decrease by 25%' in suggested_change:
        reduced_instances = current_instances * 0.25
        cost_savings = reduced_instances * base_cost_per_instance
        return f'-${cost_savings:.2f}/hour'
    else:
        return '$0.00/hour'
