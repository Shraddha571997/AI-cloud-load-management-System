"""Scaling decision helpers.

Thresholds are environment-configurable so they can be tuned without code
changes. Defaults follow the brief: scale up above 75%, scale down below 40%.
"""

import os


SCALE_UP_THRESHOLD = float(os.getenv("SCALE_UP_THRESHOLD", 75))
SCALE_DOWN_THRESHOLD = float(os.getenv("SCALE_DOWN_THRESHOLD", 40))
HIGH_UTIL_THRESHOLD = float(os.getenv("HIGH_UTIL_THRESHOLD", 85))


def scale_decision(predicted_load):
    """Make scaling decision based on predicted load."""
    if predicted_load > SCALE_UP_THRESHOLD:
        return "SCALE UP"
    if predicted_load < SCALE_DOWN_THRESHOLD:
        return "SCALE DOWN"
    return "NO ACTION"

def get_scaling_recommendations(predicted_load, confidence):
    """Get detailed scaling recommendations."""
    recommendations = []
    
    if predicted_load > HIGH_UTIL_THRESHOLD:
        recommendations.append({
            'priority': 'HIGH',
            'action': 'Immediate scale up required',
            'reason': 'CPU load exceeds 85% - performance degradation likely',
            'suggested_instances': calculate_required_instances(predicted_load)
        })
    elif predicted_load > SCALE_UP_THRESHOLD:
        recommendations.append({
            'priority': 'MEDIUM',
            'action': 'Scale up recommended',
            'reason': 'CPU load above optimal threshold',
            'suggested_instances': calculate_required_instances(predicted_load)
        })
    elif predicted_load < SCALE_DOWN_THRESHOLD:
        recommendations.append({
            'priority': 'LOW',
            'action': 'Consider scaling down',
            'reason': 'Low CPU utilization - cost optimization opportunity',
            'suggested_instances': calculate_required_instances(predicted_load)
        })
    else:
        recommendations.append({
            'priority': 'INFO',
            'action': 'Current capacity is optimal',
            'reason': 'CPU load within acceptable range',
            'suggested_instances': 'maintain current'
        })
    
    # Add confidence-based recommendations
    if confidence < 0.7:
        recommendations.append({
            'priority': 'WARNING',
            'action': 'Monitor closely',
            'reason': f'Prediction confidence is {confidence:.1%} - consider manual verification',
            'suggested_instances': 'review required'
        })
    
    return recommendations

def calculate_required_instances(predicted_load):
    """Calculate suggested number of instances based on load"""
    if predicted_load > 85:
        return 'increase by 50%'
    elif predicted_load > 75:
        return 'increase by 25%'
    elif predicted_load < 30:
        return 'decrease by 25%'
    else:
        return 'maintain current'

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
