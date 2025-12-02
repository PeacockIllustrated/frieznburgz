                                        </a >
                                    </div >
                                )}

{
    update.notes && (
        <div className="bg-muted/30 p-2 rounded text-xs text-muted-foreground italic border-l-2 border-muted-foreground/20">
            "{update.notes}"
        </div>
    )
}

<div className="mt-3 pt-3 border-t flex justify-between items-center text-xs text-muted-foreground">
    <span>Added by <span className="font-medium text-foreground">{update.createdBy?.name || 'Unknown'}</span></span>
</div>
                            </div >
                        ))}
                    </div >
                )}
            </CardContent >
        </Card >
    );
}
