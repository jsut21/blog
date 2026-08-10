
```journal-nav

```

> [!multi-column]
>
>> [!danger]+ Overdue Tasks
>> ```tasks
>>not done
>>due before <% tp.file.title %>
>>hide due date
>> ```
>
>> [!todo]+ Tasks Due Today
>> ```tasks
>> not done
>> due <% tp.file.title %>
>> hide due date
>> ```
>
>>[!help]+ Ongoing Tasks
>> ```tasks
>> not done
>> starts on or before <% tp.file.title %>
>> due after <% tp.file.title %>
>> hide due date
>> ```
>
>> [!success]+ Completed Tasks
>> ```tasks
>>done <% tp.file.title %>
>>hide due date
>> ```

![[Calendar]]

# Day planner

## TODOs

<% await tp.file.include("[[Tasks]]") %>
